import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import {
  ITEM_CATALOG,
  deriveCompanionGrowth,
  deriveJourneyGoal,
  getResultProfile,
  recommendCareItem
} from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  CloudSun,
  Hand,
  Heart,
  MapPinned,
  MessageCircle,
  Package,
  Settings,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { useAppStore } from "../store/useAppStore";
import { useDigitalLife } from "../hooks/useDigitalLife";
import "../cultivation.css";

function momentTime(value: string | undefined) {
  if (!value) return "现在";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [reaction, setReaction] = useState<{ id: number; message: string } | null>(null);
  const characterButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasInteractionOpen = useRef(false);
  const result = useAppStore((state) => state.result);
  const inventoryCount = useAppStore((state) =>
    Object.values(state.inventory).reduce((sum, count) => sum + (count ?? 0), 0)
  );
  const gamesPlayed = useAppStore((state) => state.gamesPlayed);
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const lifeEvents = useAppStore((state) => state.lifeEvents);
  const inventory = useAppStore((state) => state.inventory);
  const petVitals = useAppStore((state) => state.petVitals);
  const useItem = useAppStore((state) => state.useItem);
  const worldContext = useAppStore((state) => state.worldContext);
  useDigitalLife();
  const comfortPet = useAppStore((state) => state.comfortPet);

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
      characterButtonRef.current?.focus();
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

  if (!result) {
    return (
      <main className="centered-page">
        <section className="empty-state">
          <h1>先认识你的飞马</h1>
          <p>做完测评，它才知道该用什么方式接住你。</p>
          <Button onClick={() => void navigate({ to: "/assessment" })}>开始测评</Button>
        </section>
      </main>
    );
  }

  const profile = getResultProfile(result.typeId);
  const growth = deriveCompanionGrowth(relationshipXp);
  const journey = deriveJourneyGoal({ events: lifeEvents, gamesPlayed, relationshipXp });
  const nextMilestone = journey.milestones.find((milestone) => !milestone.completed)?.id;
  const recommendedItemId = recommendCareItem(inventory, petVitals);
  const comfortedToday = lifeEvents.some(
    (event) => event.eventKey === `quiet-moment:${new Date().toISOString().slice(0, 10)}`
  );
  const nextAction =
    nextMilestone === "first-haul"
      ? { eyebrow: "一起动一动", title: "接一场 30 秒补给雨", label: "开始游戏", to: "/game" as const }
      : nextMilestone === "shared-supply"
        ? inventoryCount > 0
          ? { eyebrow: "背包里有新东西", title: "选一份补给给它", label: "打开背包", to: "/inventory" as const }
          : { eyebrow: "先带点东西回来", title: "接一场轻松的补给雨", label: "开始游戏", to: "/game" as const }
        : nextMilestone === "saved-memory"
          ? { eyebrow: "留下一段共同生活", title: "把喜欢的动态存进记忆", label: "看看动态", to: "/life" as const }
          : nextMilestone === "trusted-pair"
            ? { eyebrow: "关系正在慢慢长大", title: "写张纸条，或只是陪它坐会儿", label: "写小纸条", to: "/companion" as const }
            : { eyebrow: "第一段航线已经画好", title: "看看它今天又做了什么", label: "打开生活簿", to: "/life" as const };
  const latestAutonomousEvent = lifeEvents.find((event) => event.source === "daily-plan");
  const latestStoryEvent = lifeEvents.find(
    (event) => event.kind === "story" || event.kind === "visitor"
  );
  const periodLabel =
    worldContext?.period === "morning"
      ? "清晨"
      : worldContext?.period === "afternoon"
        ? "午后"
        : worldContext?.period === "night"
          ? "深夜"
          : "傍晚";
  const currentMoment = latestStoryEvent ?? latestAutonomousEvent;
  const showReaction = (message: string) => setReaction({ id: Date.now(), message });
  return (
    <main className="home-page home-page--immersive">
      <header className="home-header home-header--quiet">
        <div className="home-header__identity">
          <p className="eyebrow">你的飞马草原</p>
          <h1>{profile.name}</h1>
          <span>{periodLabel} · AI 飞马正在生活</span>
        </div>
        <nav className="home-header__tools" aria-label="草原常用入口">
          <Link
            className="home-tool-link"
            aria-label={`打开背包，共 ${inventoryCount} 件`}
            to="/inventory"
          >
            <AppIcon icon={Package} size={17} />
            <span>背包</span>
            {inventoryCount > 0 ? <small>{inventoryCount}</small> : null}
          </Link>
          <Link className="home-tool-link" to="/settings" aria-label="打开设置与隐私">
            <AppIcon icon={Settings} size={17} />
            <span>设置</span>
          </Link>
        </nav>
      </header>

      <section className="lawn-stage lawn-stage--alive" aria-label="飞马生活草原">
        <div className="prairie-status prairie-status--now" aria-label="飞马当前状态">
          <AppIcon icon={CloudSun} size={15} />
          <span>{periodLabel}的草原</span>
        </div>
        <p className="lawn-stage__bubble" aria-live="polite">
          <small>
            {reaction
              ? "刚刚"
              : currentMoment
                ? `${momentTime(currentMoment.occurredAt)} · ${currentMoment.title}`
                : "现在"}
          </small>
          <span>
            {reaction?.message ||
              currentMoment?.body ||
              "我不会催你。想一起做件小事，还是先在草原坐一会儿？"}
          </span>
        </p>
        <button
          ref={characterButtonRef}
          className={`character-hotspot ${reaction ? "is-cared-for" : ""}`.trim()}
          onClick={() => setInteractionOpen(true)}
          aria-label={`和${profile.name}互动`}
        >
          <WingedHorseCharacter
            key={reaction?.id ?? "rest"}
            mood={profile.mood}
            typeId={result.typeId}
            alt={profile.name}
          />
          <span>
            <AppIcon icon={Hand} size={15} />
            陪陪它
          </span>
        </button>
        {latestStoryEvent?.kind === "visitor" ? (
          <Link className="scene-whisper" to="/life">
            有位 AI 牛马来坐过
          </Link>
        ) : null}
        <Link className="prairie-tent" to="/life" hash="map" aria-label="从帐篷打开共同足迹">
          <AppIcon icon={MapPinned} size={15} />
          <span>共同足迹</span>
        </Link>
        <div className="prairie-task-dock prairie-game-gate">
          <div>
            <p>{nextAction.eyebrow}</p>
            <strong>{nextAction.title}</strong>
          </div>
          <Link to={nextAction.to}>{nextAction.label}</Link>
        </div>
      </section>

      <section className="companion-growth-card" aria-labelledby="growth-title">
        <div className="companion-growth-card__copy">
          <p className="eyebrow">关系成长 · {growth.relationshipLabel}</p>
          <h2 id="growth-title">{growth.name}阶段</h2>
          <span>{growth.description}</span>
        </div>
        <div
          className="companion-growth-card__meter"
          role="progressbar"
          aria-label={`${growth.name}阶段成长进展`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={growth.progressPercent}
        >
          <i style={{ width: `${growth.progressPercent}%` }} />
        </div>
        <div className="companion-growth-card__footer">
          <small>{growth.unlockHint}</small>
          <Link to="/life">查看共同生活</Link>
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
            <p className="eyebrow">{growth.relationshipLabel} · AI 飞马</p>
            <h2 id="interaction-title">陪它做一件小事</h2>
            <p>不用打卡，也不会因为离开而扣分。</p>
            <div className="interaction-options">
              <button
                disabled={comfortedToday}
                onClick={() => {
                  if (comfortPet())
                    showReaction("收到摸摸了。今天不用表现得很厉害。同行值 +1");
                  setInteractionOpen(false);
                }}
              >
                <AppIcon icon={Heart} size={21} />
                <strong>{comfortedToday ? "今天已经摸过啦" : "摸摸它"}</strong>
                <span>{comfortedToday ? "它记得这个安静时刻" : "给一个安静回应"}</span>
              </button>
              <Link to="/companion">
                <AppIcon icon={MessageCircle} size={21} />
                <strong>写张小纸条</strong>
                <span>进入有边界的 AI 对话</span>
              </Link>
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
                  <strong>给它{ITEM_CATALOG[recommendedItemId].name}</strong>
                  <span>背包还有 {inventory[recommendedItemId]} 件 · 使用后会留下共同记录</span>
                </button>
              ) : inventoryCount > 0 ? (
                <Link to="/inventory">
                  <AppIcon icon={Package} size={21} />
                  <strong>先把补给收好</strong>
                  <span>它现在状态刚好，需要时再使用</span>
                </Link>
              ) : (
                <Link to="/game">
                  <AppIcon icon={Package} size={21} />
                  <strong>去接一份补给</strong>
                  <span>玩一局，再带礼物回草原</span>
                </Link>
              )}
              <Link to="/life" hash="map">
                <AppIcon icon={Camera} size={21} />
                <strong>贴张生活照片</strong>
                <span>放进只属于你们的共同足迹</span>
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
