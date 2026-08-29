import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import {
  CHARACTER_NAME,
  ITEM_CATALOG,
  ITEM_IDS,
  createWorkdayComic,
  deriveCompanionGrowth,
  getResultProfile,
  recommendCareItem,
  type ItemId
} from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BatteryCharging,
  BookImage,
  ChevronRight,
  Heart,
  Package,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Waves,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { ItemIcon } from "../components/ItemIcon";
import { LailaiStandFace } from "../components/LailaiStandFace";
import { WorkdayComicSheet } from "../components/WorkdayComicSheet";
import { subscribeDeviceEvents, sendMoodToDevice } from "../lib/devices";
import { trackEvent } from "../lib/analytics";
import { createWorkdayComicCard } from "../lib/workdayComicCard";
import { useDigitalLife } from "../hooks/useDigitalLife";
import { useAppStore } from "../store/useAppStore";
import "../cultivation.css";
import "../digital-life-experience.css";

function chooseSceneDrops(seedSource: string): ItemId[] {
  let seed = 0;
  for (const character of seedSource) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;

  const choices = [...ITEM_IDS];
  return Array.from({ length: 3 }, () => {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
    return choices.splice(seed % choices.length, 1)[0] as ItemId;
  });
}

function getMoodLabel(energy: number, chaos: number, defaultMood: string) {
  if (energy < 35) return "想歇会儿";
  if (chaos > 70) return "有点炸毛";
  if (defaultMood === "happy") return "心情不错";
  return "安静在线";
}

export function DigitalLifeExperiencePage() {
  const navigate = useNavigate();
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [reaction, setReaction] = useState<{ id: number; message: string } | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectedKeys, setCollectedKeys] = useState<string[]>([]);
  const characterButtonRef = useRef<HTMLButtonElement>(null);
  const interactionTriggerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasInteractionOpen = useRef(false);
  const sceneDropsRef = useRef<{ key: string; items: ItemId[] } | null>(null);
  const result = useAppStore((state) => state.result);
  const inventory = useAppStore((state) => state.inventory);
  const inventoryCount = useAppStore((state) =>
    Object.values(state.inventory).reduce((sum, count) => sum + (count ?? 0), 0)
  );
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const lifeEvents = useAppStore((state) => state.lifeEvents);
  const petVitals = useAppStore((state) => state.petVitals);
  const useItem = useAppStore((state) => state.useItem);
  const collectItem = useAppStore((state) => state.collectItem);
  const comfortPet = useAppStore((state) => state.comfortPet);
  const deviceId = useAppStore((state) => state.deviceId);
  const workShift = useAppStore((state) => state.workShift);
  const clockIn = useAppStore((state) => state.clockIn);
  const clockOut = useAppStore((state) => state.clockOut);
  const gamesPlayed = useAppStore((state) => state.gamesPlayed);
  const todayCaughtCount = useAppStore((state) => state.todayCaughtCount);
  const [comicOpen, setComicOpen] = useState(false);
  const [standFaceOpen, setStandFaceOpen] = useState(false);
  const [comicMessage, setComicMessage] = useState("");
  const [comicSharing, setComicSharing] = useState(false);
  useDigitalLife();

  // 监听硬件实体交互，深度融入家园气泡与互动
  useEffect(() => {
    const targetDeviceId = deviceId || "lamp-001";
    const unsubscribe = subscribeDeviceEvents(targetDeviceId, (event) => {
      // 1. 实体触摸/按压 -> 触发角色抚摸与气泡对话
      if (event.type === "touch_comfort") {
        comfortPet();
        showReaction(event.message);
        // 如果按压力度很大，联动灯效为舒缓暖光以安抚用户
        if (event.stressLevel === "intense" || event.stressLevel === "high") {
          void sendMoodToDevice(targetDeviceId, "tired");
        }
      } else if (event.type === "worker_presence") {
        // 2. 超声波检测到打工人来到工位
        showReaction(event.message);
      }
    });

    return unsubscribe;
  }, [deviceId, comfortPet]);

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
          <Button onClick={() => void navigate({ to: "/assessment" })}>开始测评</Button>
        </section>
      </main>
    );
  }

  const profile = getResultProfile(result.typeId);
  const growth = deriveCompanionGrowth(relationshipXp);
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
  const moodLabel = getMoodLabel(petVitals.energy, petVitals.chaos, profile.mood);
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

  const handleCollectDrop = (itemId: ItemId, dropIndex: number) => {
    const key = `${sceneDropKey}:${dropIndex}:${itemId}`;
    if (collectedKeys.includes(key) || collectingId === key) return;
    setCollectingId(key);
    collectItem(itemId, 1);
    const item = ITEM_CATALOG[itemId];
    showReaction(`捡到了${item.name.replace("补给", "")}！已放进背包～`);
    window.setTimeout(() => {
      setCollectedKeys((prev) => [...prev, key]);
      setCollectingId((curr) => (curr === key ? null : curr));
    }, 450);
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
        <nav className="digital-life-header__toolbar" aria-label="来来当前状态与常用入口">
          <div className="home-status-pill" aria-label="来来当前状态">
            <span
              className="home-status-pill__item home-status-pill__item--mood"
              aria-label={`心情 ${moodLabel}`}
            >
              <AppIcon icon={Heart} size={15} />
              <em>{moodLabel}</em>
            </span>
            <i className="home-status-pill__divider" aria-hidden="true" />
            <span
              className="home-status-pill__item home-status-pill__item--energy"
              aria-label={`元气 ${petVitals.energy}`}
            >
              <AppIcon icon={BatteryCharging} size={15} />
              <em>{petVitals.energy}</em>
            </span>
          </div>
          <div className="home-tool-group">
            <Link
              className="home-tool-link"
              aria-label={`打开背包，共 ${inventoryCount} 件`}
              to="/inventory"
            >
              <AppIcon icon={Package} size={19} />
              <span>背包</span>
              {inventoryCount > 0 ? <small>{inventoryCount}</small> : null}
            </Link>
            <Link className="home-tool-link" to="/settings" aria-label="打开设置与隐私">
              <AppIcon icon={Settings} size={19} />
              <span>设置</span>
            </Link>
          </div>
        </nav>

        <div className="home-header__identity digital-life-header__identity">
          <h1>{CHARACTER_NAME}</h1>
          <p className="digital-life-presence">
            <i aria-hidden="true" />
            <span>
              {profile.name}状态 · {growth.relationshipLabel}
            </span>
          </p>
        </div>
      </header>

      <section
        className="lawn-stage lawn-stage--alive digital-life-stage"
        aria-label="来来生活草原"
      >
        <div className="digital-life-stage__drops" aria-label="来来刚带回来的补给">
          <div className="digital-life-stage__drops-heading">
            <span>
              <AppIcon icon={Sparkles} size={15} />
              刚带回来的补给
            </span>
            <small>点一下收进背包</small>
          </div>
          <div className="digital-life-stage__drop-list">
            {sceneDrops.map((itemId, index) => {
              const item = ITEM_CATALOG[itemId];
              const dropKey = `${sceneDropKey}:${index}:${itemId}`;
              const isCollected = collectedKeys.includes(dropKey);
              const isCollecting = collectingId === dropKey;

              if (isCollected) return null;

              return (
                <button
                  className={`digital-life-stage__drop ${
                    isCollecting ? "is-collecting" : ""
                  }`.trim()}
                  key={dropKey}
                  type="button"
                  onClick={() => handleCollectDrop(itemId, index)}
                  aria-label={`收集掉落的${item.name}`}
                  disabled={isCollecting}
                >
                  {isCollecting ? (
                    <span className="digital-life-stage__drop-badge" aria-hidden="true">
                      +1
                    </span>
                  ) : null}
                  <ItemIcon itemId={itemId} size={25} />
                  <span>{item.name.replace("补给", "")}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="digital-life-stage__actor">
          <p className="lawn-stage__bubble digital-life-stage__speech" aria-live="polite">
            <span>
              {reaction?.message ||
                currentMoment?.body ||
                "我不会催你。想说点什么，还是先在草原坐一会儿？"}
            </span>
          </p>
          <button
            ref={characterButtonRef}
            className={`character-hotspot ${reaction ? "is-cared-for" : ""}`.trim()}
            onClick={(event) => openInteraction(event.currentTarget)}
            aria-label={`和${CHARACTER_NAME}互动`}
          >
            <WingedHorseCharacter
              key={reaction?.id ?? "rest"}
              mood={profile.mood}
              typeId={result.typeId}
              alt={CHARACTER_NAME}
            />
          </button>
        </div>
        <Link className="digital-life-stage__tent-link" to="/life" aria-label="打开生活簿">
          <img
            className="digital-life-stage__tent"
            src="/scene/prairie-tent.webp"
            width="640"
            height="492"
            alt=""
            aria-hidden="true"
          />
          <span>
            <AppIcon icon={BookImage} size={15} />
            生活簿
          </span>
        </Link>
        <div className="digital-life-actions" aria-label="和来来互动">
          <Link
            className="digital-life-actions__composer"
            to="/companion"
            aria-label="和来来聊一聊"
          >
            <span>和来来聊一聊…</span>
            <span className="digital-life-actions__composer-send" aria-hidden="true">
              <AppIcon icon={Send} size={18} />
            </span>
          </Link>
          <button
            type="button"
            className="digital-life-actions__supply"
            aria-label="接补给：去玩补给雨"
            onClick={() => void navigate({ to: "/game", hash: "start" })}
          >
            <AppIcon icon={Sparkles} size={18} />
            <span>接补给</span>
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
              去共同生活簿看看
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
