import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import {
  CHARACTER_NAME,
  ITEM_CATALOG,
  ITEM_IDS,
  createWorkdayComic,
  deriveCompanionGrowth,
  deriveCompanionPrairieState,
  getResultProfile,
  recommendCareItem,
  toCharacterSpeech,
  type ItemId
} from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BatteryCharging,
  ChevronRight,
  Coffee,
  Droplets,
  Flame,
  Heart,
  Package,
  Settings,
  Smartphone,
  Fish,
  Sparkles,
  Users,
  Waves,
  Wind,
  X
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AppIcon } from "../components/AppIcon";
import { CompanionComposer, type CompanionComposerSubmit } from "../components/CompanionComposer";
import { ItemIcon } from "../components/ItemIcon";
import { LailaiStandFace } from "../components/LailaiStandFace";
import { WorkdayComicSheet } from "../components/WorkdayComicSheet";
import { createClientId } from "../lib/clientId";
import { CompanionStreamError, streamCompanionMessage } from "../lib/companionStream";
import { subscribeDeviceEvents, sendMoodToDevice } from "../lib/devices";
import { trackEvent } from "../lib/analytics";
import { createWorkdayComicCard } from "../lib/workdayComicCard";
import { useDigitalLife } from "../hooks/useDigitalLife";
import { useKeyboardInset } from "../hooks/useKeyboardInset";
import { useAppStore } from "../store/useAppStore";
import "../cultivation.css";
import "../digital-life-experience.css";

const HOME_CHAT_FALLBACK = "我暂时连不上远处，但还在这儿。点开对话框，还能慢慢说。";

type SceneDropLayout = {
  itemId: ItemId;
  left: number;
  top: number;
  rotate: number;
  delayMs: number;
};

function chooseSceneDrops(seedSource: string): SceneDropLayout[] {
  let seed = 0;
  for (const character of seedSource) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;

  const next = () => {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
    return seed;
  };

  const choices = [...ITEM_IDS];
  const slots = [
    { left: 10, top: 6 },
    { left: 38, top: 2 },
    { left: 22, top: 18 }
  ];

  return slots.map((slot, index) => {
    const itemId = choices.splice(next() % choices.length, 1)[0] as ItemId;
    const leftJitter = (next() % 9) - 4;
    const topJitter = (next() % 7) - 3;
    const rotate = ((next() % 17) - 8) * 1.2;
    return {
      itemId,
      left: Math.min(52, Math.max(6, slot.left + leftJitter)),
      top: Math.min(24, Math.max(1, slot.top + topJitter)),
      rotate,
      delayMs: index * 180 + (next() % 120)
    };
  });
}

function getMoodLabel(energy: number, chaos: number, defaultMood: string) {
  if (energy < 35) return "想歇会儿";
  if (chaos > 70) return "有点炸毛";
  if (defaultMood === "happy") return "心情不错";
  return "安静在线";
}

function getMoodMeter(energy: number, chaos: number) {
  return Math.max(0, Math.min(100, Math.round((energy + (100 - chaos)) / 2)));
}

export function DigitalLifeExperiencePage() {
  const navigate = useNavigate();
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [reaction, setReaction] = useState<{ id: number; message: string } | null>(null);
  const [quickDraft, setQuickDraft] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectedKeys, setCollectedKeys] = useState<string[]>(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(`wingedhorse-collected-drops:${today}`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const characterButtonRef = useRef<HTMLButtonElement>(null);
  const interactionTriggerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasInteractionOpen = useRef(false);
  const sceneDropsRef = useRef<{ key: string; items: SceneDropLayout[] } | null>(null);
  const chatSessionId = useRef(createClientId());
  const chatAbortRef = useRef<AbortController | null>(null);
  const lastChatExchange = useRef<{ user: string; assistant: string } | null>(null);
  const result = useAppStore((state) => state.result);
  const inventory = useAppStore((state) => state.inventory);
  const inventoryCount = useAppStore((state) =>
    Object.values(state.inventory).reduce((sum, count) => sum + (count ?? 0), 0)
  );
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const lifeEvents = useAppStore((state) => state.lifeEvents);
  const memories = useAppStore((state) => state.memories);
  const petVitals = useAppStore((state) => state.petVitals);
  const dailyPlan = useAppStore((state) => state.dailyPlan);
  const worldContext = useAppStore((state) => state.worldContext);
  const useItem = useAppStore((state) => state.useItem);
  const collectItem = useAppStore((state) => state.collectItem);
  const comfortPet = useAppStore((state) => state.comfortPet);
  const addMemory = useAppStore((state) => state.addMemory);
  const deviceId = useAppStore((state) => state.deviceId);
  const hardwareLink = useAppStore((state) => state.hardwareLink);
  const manualMood = useAppStore((state) => state.manualMood);
  const workShift = useAppStore((state) => state.workShift);
  const clockIn = useAppStore((state) => state.clockIn);
  const clockOut = useAppStore((state) => state.clockOut);
  const gamesPlayed = useAppStore((state) => state.gamesPlayed);
  const todayCaughtCount = useAppStore((state) => state.todayCaughtCount);
  const [climateDrop, setClimateDrop] = useState<{
    type: "climate_dry" | "climate_hot" | "climate_cold" | "climate_humid";
    title: string;
    message: string;
    itemId?: ItemId;
    memoryFact: string;
    temperature?: number | null;
    humidity?: number | null;
  } | null>(null);
  const [comicOpen, setComicOpen] = useState(false);
  const [standFaceOpen, setStandFaceOpen] = useState(false);
  const [comicMessage, setComicMessage] = useState("");
  const [comicSharing, setComicSharing] = useState(false);
  useDigitalLife();
  useKeyboardInset();

  // 监听硬件实体交互，深度融入家园气泡与互动
  useEffect(() => {
    const targetDeviceId = deviceId.trim();
    if (!hardwareLink || !targetDeviceId) return;
    const unsubscribe = subscribeDeviceEvents(targetDeviceId, (event) => {
      // 1. 实体触摸/按压 -> 触发角色抚摸与气泡对话，写入长期生活记忆
      if (event.type === "touch_comfort") {
        comfortPet();
        showReaction(event.message);
        if (event.memoryFact) addMemory(event.memoryFact);
        // 如果按压力度很大，联动灯效为舒缓暖光以安抚用户
        if (event.stressLevel === "intense" || event.stressLevel === "high") {
          void sendMoodToDevice(targetDeviceId, "tired", { linked: true });
        }
      } else if (event.type === "worker_presence") {
        // 2. 超声波检测到打工人来到工位
        showReaction(event.message);
      } else if (
        event.type === "climate_dry" ||
        event.type === "climate_hot" ||
        event.type === "climate_cold" ||
        event.type === "climate_humid"
      ) {
        // 3. DHT 温湿度微气候触发 -> 展示草原专属浮动补给包并更新台词
        setClimateDrop(event);
        showReaction(event.message);
      }
    });

    return unsubscribe;
  }, [addMemory, comfortPet, deviceId, hardwareLink]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInteractionOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (interactionOpen) {
      wasInteractionOpen.current = true;
      closeButtonRef.current?.focus();
    } else if (wasInteractionOpen.current) {
      (interactionTriggerRef.current ?? characterButtonRef.current)?.focus();
    }
  }, [interactionOpen]);

  useEffect(() => {
    if (!reaction) return;
    const timeout = window.setTimeout(
      () => setReaction((current) => (current?.id === reaction.id ? null : current)),
      6_500
    );
    return () => window.clearTimeout(timeout);
  }, [reaction]);

  useEffect(() => {
    if (result) trackEvent("home_view");
  }, [result]);

  if (!result) {
    return (
      <main className="centered-page">
        <section className="empty-state">
          <h1>先认识来来</h1>
          <p>做完测评，它才知道该用什么方式接住你。</p>
          <Button onClick={() => void navigate({ to: "/assessment" })}>开始测测</Button>
        </section>
      </main>
    );
  }

  const profile = getResultProfile(result.typeId);
  const growth = deriveCompanionGrowth(relationshipXp);
  const latestMemory =
    memories.length > 0 ? (memories[memories.length - 1]?.content ?? null) : null;
  const latestEvent = lifeEvents.length > 0 ? (lifeEvents[0] ?? null) : null;
  const prairieState = deriveCompanionPrairieState({
    typeId: result.typeId,
    vitals: petVitals,
    relationshipXp,
    manualMood,
    latestEvent,
    recentMemory: latestMemory,
    isInteracting: interactionOpen || chatSending
  });
  const recommendedItemId = recommendCareItem(inventory, petVitals);
  const comfortedToday = lifeEvents.some(
    (event) => event.eventKey === `quiet-moment:${new Date().toISOString().slice(0, 10)}`
  );
  const latestAutonomousEvent = lifeEvents.find((event) => event.source === "daily-plan");
  const latestStoryEvent = lifeEvents.find(
    (event) => event.kind === "story" || event.kind === "visitor"
  );
  const currentMoment = latestStoryEvent ?? latestAutonomousEvent;
  const careMeters = [
    { id: "energy", label: "元气", value: petVitals.energy, icon: BatteryCharging },
    { id: "ease", label: "松弛", value: 100 - petVitals.chaos, icon: Waves }
  ];
  const todayDate = new Date().toISOString().slice(0, 10);
  const sceneDropKey = `${result.typeId}:${todayDate}`;
  if (!sceneDropsRef.current || sceneDropsRef.current.key !== sceneDropKey) {
    sceneDropsRef.current = {
      key: sceneDropKey,
      items: chooseSceneDrops(sceneDropKey)
    };
  }
  const sceneDrops = sceneDropsRef.current.items;
  const remainingDrops = sceneDrops
    .map((drop, index) => ({
      ...drop,
      index,
      dropKey: `${sceneDropKey}:${index}:${drop.itemId}`
    }))
    .filter((drop) => !collectedKeys.includes(drop.dropKey));
  const moodLabel = getMoodLabel(petVitals.energy, petVitals.chaos, profile.mood);
  const moodMeter = getMoodMeter(petVitals.energy, petVitals.chaos);
  const onDuty = workShift.status === "on";
  const comic = createWorkdayComic({
    dateLabel: `${new Date().getMonth() + 1}月${new Date().getDate()}日`,
    clockedIn: onDuty || workShift.dateKey === todayDate,
    gamesPlayed,
    caughtCount: todayCaughtCount,
    momentLine: currentMoment?.body ?? null,
    typeId: result.typeId
  });
  const openInteraction = (trigger: HTMLElement) => {
    interactionTriggerRef.current = trigger;
    setInteractionOpen(true);
  };
  const showReaction = (message: string) => setReaction({ id: Date.now(), message });

  const openChatDetail = () => {
    if (lastChatExchange.current) {
      sessionStorage.setItem(
        "wingedhorse-companion-seed",
        JSON.stringify({
          messages: [
            { role: "user", content: lastChatExchange.current.user },
            { role: "assistant", content: lastChatExchange.current.assistant }
          ]
        })
      );
    }
    void navigate({ to: "/companion" });
  };

  const sendQuickChat = async ({ text, localImageUrl }: CompanionComposerSubmit) => {
    const content = text.trim();
    if (!content || chatSending) return;
    setInteractionOpen(false);
    setChatSending(true);
    setChatReply("…");
    setReaction(null);
    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 18_000);
    try {
      const data = await streamCompanionMessage(
        {
          sessionId: chatSessionId.current,
          message: content,
          history: [],
          memoryEnabled: false,
          memories: [],
          typeId: result.typeId,
          ...(dailyPlan && worldContext
            ? {
                lifeContext: {
                  typeId: result.typeId,
                  world: worldContext,
                  plan: dailyPlan,
                  vitals: petVitals,
                  relationshipXp,
                  recentEvents: lifeEvents
                    .slice(0, 6)
                    .map(({ title, body, occurredAt }) => ({ title, body, occurredAt })),
                  inventory: Object.entries(inventory)
                    .filter((entry): entry is [ItemId, number] => Boolean(entry[1]))
                    .slice(0, 12)
                    .map(([id, count]) => ({ name: ITEM_CATALOG[id].name, count }))
                }
              }
            : {})
        },
        (partial) => setChatReply(partial || "…"),
        controller.signal
      );
      setChatReply(data.reply);
      lastChatExchange.current = { user: content, assistant: data.reply };
    } catch (error) {
      const rateLimited =
        error instanceof CompanionStreamError && error.code === "COMPANION_RATE_LIMITED";
      const fallback = rateLimited
        ? "消息来得有点密，我先停一小会儿。点开对话框还能继续看。"
        : HOME_CHAT_FALLBACK;
      setChatReply(fallback);
      lastChatExchange.current = { user: content, assistant: fallback };
    } finally {
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
      window.clearTimeout(timeout);
      if (chatAbortRef.current === controller) {
        chatAbortRef.current = null;
        setChatSending(false);
      }
    }
  };

  useEffect(() => () => chatAbortRef.current?.abort(), []);

  const handleCollectDrop = (itemId: ItemId, dropIndex: number) => {
    const key = `${sceneDropKey}:${dropIndex}:${itemId}`;
    if (collectedKeys.includes(key) || collectingId === key) return;
    setCollectingId(key);
    collectItem(itemId, 1);
    const item = ITEM_CATALOG[itemId];
    showReaction(`捡到了${item.name.replace("补给", "")}！已放进背包～`);
    window.setTimeout(() => {
      setCollectedKeys((prev) => {
        const next = [...prev, key];
        try {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem(`wingedhorse-collected-drops:${today}`, JSON.stringify(next));
        } catch {
          // Ignore local storage write errors
        }
        return next;
      });
      setCollectingId((curr) => (curr === key ? null : curr));
    }, 450);
  };

  const handleClaimClimateDrop = () => {
    if (!climateDrop) return;
    const targetDeviceId = deviceId.trim();
    if (climateDrop.itemId) {
      collectItem(climateDrop.itemId, 1);
    }
    comfortPet();
    if (climateDrop.memoryFact) {
      addMemory(climateDrop.memoryFact);
    }
    const itemName = climateDrop.itemId
      ? ITEM_CATALOG[climateDrop.itemId].name.replace("补给", "")
      : "清爽能量";
    showReaction(`（开心收下）收到了${itemName}！${climateDrop.message}`);
    if (hardwareLink && targetDeviceId) {
      void sendMoodToDevice(targetDeviceId, "good", { linked: true });
    }
    setClimateDrop(null);
  };

  const handleClockIn = () => {
    clockIn();
    setStandFaceOpen(true);
    trackEvent("clock_in", { source: "home" });
    trackEvent("stand_face_show", { mood: "on-duty" });
    showReaction("来了。手机给我，你去忙。");
  };

  const handleClockOut = () => {
    clockOut();
    setComicOpen(true);
    trackEvent("clock_out");
    showReaction("收工。草原见。");
  };

  const shareComic = async () => {
    setComicSharing(true);
    setComicMessage("生成中…");
    try {
      const blob = await createWorkdayComicCard(comic);
      const file = new File([blob], `${CHARACTER_NAME}的一天.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${CHARACTER_NAME}的一天`,
          text: comic.slogan,
          files: [file]
        });
        setComicMessage("已分享。");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
        setComicMessage("已保存。");
      }
      trackEvent("comic_share");
    } catch {
      setComicMessage("没画出来，稍后再试。");
    } finally {
      setComicSharing(false);
    }
  };

  return (
    <main className="home-page home-page--immersive">
      <header className="home-header home-header--quiet digital-life-header">
        <div className="home-header__identity digital-life-header__identity">
          <h1>来来的草原</h1>
          <div className="digital-life-header__tags" aria-label="当前身份与状态">
            <span className="digital-life-chip">{profile.name}</span>
            <span className="digital-life-chip">{growth.relationshipLabel}</span>
            <span className="digital-life-chip digital-life-chip--presence">
              <i aria-hidden="true" />
              {prairieState.statusNote}
            </span>
          </div>
          <div className="digital-life-header__meters" aria-label="来来当前状态">
            <div className="digital-life-meter digital-life-meter--mood">
              <AppIcon icon={Heart} size={14} />
              <div
                className="digital-life-meter__track"
                role="progressbar"
                aria-label={`心情 ${moodLabel}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={moodMeter}
              >
                <i style={{ width: `${moodMeter}%` }} />
              </div>
              <em>{moodLabel}</em>
            </div>
            <div className="digital-life-meter digital-life-meter--energy">
              <AppIcon icon={BatteryCharging} size={14} />
              <div
                className="digital-life-meter__track"
                role="progressbar"
                aria-label={`元气 ${petVitals.energy}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={petVitals.energy}
              >
                <i style={{ width: `${petVitals.energy}%` }} />
              </div>
              <em>{petVitals.energy}</em>
            </div>
          </div>
        </div>
      </header>

      <nav className="digital-life-rail" aria-label="常用入口">
        <Link
          className="digital-life-rail__btn"
          aria-label={`打开背包，共 ${inventoryCount} 件`}
          to="/inventory"
        >
          <AppIcon icon={Package} size={20} />
          <span>背包</span>
          {inventoryCount > 0 ? <small>{inventoryCount}</small> : null}
        </Link>
        <Link className="digital-life-rail__btn" to="/settings" aria-label="打开设置与隐私">
          <AppIcon icon={Settings} size={20} />
          <span>设置</span>
        </Link>
      </nav>

      <section
        className={`lawn-stage lawn-stage--alive digital-life-stage digital-life-stage--${prairieState.ambientTheme}`}
        aria-label="来来生活草原"
      >
        {remainingDrops.length > 0 ? (
          <div className="digital-life-stage__drops" aria-label="来来刚带回来的补给">
            {remainingDrops.map(({ itemId, index, dropKey, left, top, rotate, delayMs }) => {
              const item = ITEM_CATALOG[itemId];
              const isCollecting = collectingId === dropKey;

              return (
                <button
                  className={`digital-life-stage__drop ${
                    isCollecting ? "is-collecting" : ""
                  }`.trim()}
                  key={dropKey}
                  type="button"
                  style={
                    {
                      left: `${left}%`,
                      top: `${top}%`,
                      "--drop-rotate": `${rotate}deg`,
                      "--drop-delay": `${delayMs}ms`
                    } as CSSProperties
                  }
                  onClick={() => handleCollectDrop(itemId, index)}
                  aria-label={`收集掉落的${item.name}`}
                  disabled={isCollecting}
                >
                  {isCollecting ? (
                    <span className="digital-life-stage__drop-badge" aria-hidden="true">
                      +1
                    </span>
                  ) : null}
                  <ItemIcon itemId={itemId} size={28} />
                </button>
              );
            })}
          </div>
        ) : null}

        {climateDrop ? (
          <div
            className={`digital-life-stage__climate-gift ${
              climateDrop.type === "climate_hot"
                ? "digital-life-stage__climate-gift--hot"
                : climateDrop.type === "climate_dry"
                  ? "digital-life-stage__climate-gift--dry"
                  : ""
            }`.trim()}
            role="status"
            aria-live="polite"
          >
            <div className="digital-life-stage__climate-gift-info">
              <div className="digital-life-stage__climate-gift-icon">
                <AppIcon
                  icon={
                    climateDrop.type === "climate_dry"
                      ? Droplets
                      : climateDrop.type === "climate_hot"
                        ? Flame
                        : climateDrop.type === "climate_cold"
                          ? Coffee
                          : Wind
                  }
                  size={20}
                />
              </div>
              <div className="digital-life-stage__climate-gift-text">
                <strong>{climateDrop.title}</strong>
                <span>
                  {climateDrop.humidity ? `湿度 ${climateDrop.humidity}% ` : ""}
                  {climateDrop.temperature ? `温度 ${climateDrop.temperature.toFixed(1)}°C` : ""}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="digital-life-stage__climate-gift-btn"
              onClick={handleClaimClimateDrop}
            >
              <AppIcon icon={Sparkles} size={13} />
              <span>领取</span>
            </button>
          </div>
        ) : null}

        <div className="digital-life-stage__actor">
          {chatReply ? (
            <button
              type="button"
              className="lawn-stage__bubble digital-life-stage__speech digital-life-stage__speech--chat"
              aria-live="polite"
              aria-label="打开聊天详情"
              onClick={openChatDetail}
            >
              <span>{chatReply}</span>
              {!chatSending ? <small>点开继续聊</small> : null}
            </button>
          ) : (
            <p className="lawn-stage__bubble digital-life-stage__speech" aria-live="polite">
              <span>
                {reaction?.message ||
                  (currentMoment?.body ? toCharacterSpeech(currentMoment.body) : null) ||
                  prairieState.bubbleSpeech ||
                  "我不会催你。想说点什么，还是先在草原坐一会儿？"}
              </span>
            </p>
          )}
          <button
            ref={characterButtonRef}
            className={`character-hotspot ${reaction || chatReply ? "is-cared-for" : ""}`.trim()}
            onClick={(event) => openInteraction(event.currentTarget)}
            aria-label={`和${CHARACTER_NAME}互动`}
          >
            <WingedHorseCharacter
              key={reaction?.id ?? chatReply ?? prairieState.visualMood}
              mood={reaction ? profile.mood : prairieState.visualMood}
              activity={chatSending ? "listening" : prairieState.activity}
              typeId={result.typeId}
              alt={CHARACTER_NAME}
            />
          </button>
        </div>
        <Link className="digital-life-stage__tent-link" to="/life" aria-label="打开朋友圈">
          <img
            className="digital-life-stage__tent"
            src="/scene/prairie-tent.webp"
            width="640"
            height="492"
            alt=""
            aria-hidden="true"
          />
          <span className="digital-life-stage__tent-badge">
            <AppIcon icon={Users} size={22} />
          </span>
        </Link>
        <div className="digital-life-actions" aria-label="和来来互动">
          <CompanionComposer
            variant="home"
            inputId="home-quick-chat"
            value={quickDraft}
            onChange={setQuickDraft}
            onSubmit={(payload) => void sendQuickChat(payload)}
            disabled={chatSending}
            maxLength={200}
            placeholder="说一句…"
            ariaLabel="和来来说一句"
            signalsReturnTo="/home"
          />
          <button
            type="button"
            className="digital-life-actions__moyu"
            aria-label="开始摸鱼：去接补给"
            onClick={() => void navigate({ to: "/game", hash: "start" })}
          >
            <AppIcon icon={Fish} size={22} />
          </button>
        </div>
      </section>

      {interactionOpen ? (
        <div className="interaction-backdrop" onPointerDown={() => setInteractionOpen(false)}>
          <section
            className="interaction-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="interaction-title"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              className="interaction-sheet__close"
              onClick={() => setInteractionOpen(false)}
              aria-label="关闭互动"
            >
              <AppIcon icon={X} size={22} />
            </button>
            <p className="eyebrow">{growth.relationshipLabel} · 照顾</p>
            <h2 id="interaction-title">家园养成</h2>
            <p>补给在背包里，用一用就有反应。</p>
            <div className="cultivation-vitals" aria-label="来来当前状态">
              {careMeters.map(({ id, label, value, icon }) => (
                <div className="cultivation-vitals__item" key={id}>
                  <span>
                    <AppIcon icon={icon} size={17} />
                    {label}
                  </span>
                  <div
                    className="cultivation-vitals__meter"
                    role="progressbar"
                    aria-label={`${label}状态`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={value}
                  >
                    <i style={{ width: `${value}%` }} />
                  </div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="interaction-options interaction-options--care">
              <button
                disabled={comfortedToday}
                onClick={() => {
                  if (comfortPet()) showReaction("收到摸摸了。今天不用表现得很厉害。同行值 +1");
                  setInteractionOpen(false);
                }}
              >
                <AppIcon icon={Heart} size={21} />
                <strong>{comfortedToday ? "今天已经摸过啦" : "摸摸它"}</strong>
                <span>{comfortedToday ? "它记得这个安静时刻" : "给一个安静回应"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInteractionOpen(false);
                  if (onDuty) handleClockOut();
                  else handleClockIn();
                }}
              >
                <AppIcon icon={Smartphone} size={21} />
                <strong>{onDuty ? "收工，看来来的一天" : "上工，把手机交给来来"}</strong>
                <span>{onDuty ? "生成今日四格小记" : "支架上的来来帮你看着工位"}</span>
              </button>
              {recommendedItemId ? (
                <button
                  onClick={() => {
                    const item = ITEM_CATALOG[recommendedItemId];
                    if (useItem(recommendedItemId))
                      showReaction(
                        `它收下了${item.name}。不是数字涨了，是今天真的被照顾到了一点。`
                      );
                    setInteractionOpen(false);
                  }}
                >
                  <AppIcon icon={Package} size={21} />
                  <strong>给它{ITEM_CATALOG[recommendedItemId].name.replace("补给", "")}</strong>
                  <span>背包还有 {inventory[recommendedItemId]} 件 · 使用后会留下共同记录</span>
                </button>
              ) : inventoryCount > 0 ? (
                <Link to="/inventory">
                  <AppIcon icon={Package} size={21} />
                  <strong>先把补给收好</strong>
                  <span>它现在状态刚好，需要时再使用</span>
                </Link>
              ) : (
                <Link to="/game" hash="start">
                  <AppIcon icon={Package} size={21} />
                  <strong>去接一份补给</strong>
                  <span>玩一局，再带礼物回草原</span>
                </Link>
              )}
            </div>
            <Link className="interaction-sheet__journal" to="/life">
              去朋友圈看看
              <AppIcon icon={ChevronRight} size={17} />
            </Link>
          </section>
        </div>
      ) : null}
      {standFaceOpen ? (
        <LailaiStandFace
          mood={petVitals.energy < 35 ? "tired" : "on-duty"}
          onClose={() => setStandFaceOpen(false)}
        />
      ) : null}
      {comicOpen ? (
        <WorkdayComicSheet
          comic={comic}
          sharing={comicSharing}
          message={comicMessage}
          onShare={() => void shareComic()}
          onClose={() => setComicOpen(false)}
        />
      ) : null}
    </main>
  );
}
