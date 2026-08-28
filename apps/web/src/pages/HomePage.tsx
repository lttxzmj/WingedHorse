import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { getResultProfile } from "@wingedhorse/domain";
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

function relationshipLabel(value: number) {
  if (value >= 60) return "并肩老友";
  if (value >= 25) return "默契搭子";
  if (value >= 10) return "熟悉伙伴";
  return "刚刚同行";
}

function momentTime(value: string | undefined) {
  if (!value) return "现在";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [reaction, setReaction] = useState("");
  const [comforted, setComforted] = useState(false);
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
  const taskDone = gamesPlayed > 0;
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
            {reaction ||
              currentMoment?.body ||
              "我不会催你。想一起做件小事，还是先在草原坐一会儿？"}
          </span>
        </p>
        <button
          ref={characterButtonRef}
          className="character-hotspot"
          onClick={() => setInteractionOpen(true)}
          aria-label={`和${profile.name}互动`}
        >
          <WingedHorseCharacter mood={profile.mood} typeId={result.typeId} alt={profile.name} />
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
            <p>{taskDone ? "补给雨仍在继续" : "今天的一件小事"}</p>
            <strong>{taskDone ? "想玩时，再接一场" : "陪我接一场 30 秒补给雨"}</strong>
          </div>
          <Link to="/game">{taskDone ? "再玩一局" : "开始游戏"}</Link>
        </div>
      </section>

      <div className="home-continuity">
        <Link to="/life">看看它今天还做了什么</Link>
        <span>{relationshipLabel(relationshipXp)} · 同行值 {relationshipXp}</span>
      </div>

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
            <p className="eyebrow">{relationshipLabel(relationshipXp)} · AI 飞马</p>
            <h2 id="interaction-title">陪它做一件小事</h2>
            <p>不用打卡，也不会因为离开而扣分。</p>
            <div className="interaction-options">
              <button
                disabled={comforted}
                onClick={() => {
                  comfortPet();
                  setComforted(true);
                  setReaction("收到摸摸了。今天不用表现得很厉害。同行值 +1");
                  setInteractionOpen(false);
                }}
              >
                <AppIcon icon={Heart} size={21} />
                <strong>{comforted ? "已经摸过啦" : "摸摸它"}</strong>
                <span>给一个安静回应</span>
              </button>
              <Link to="/companion">
                <AppIcon icon={MessageCircle} size={21} />
                <strong>写张小纸条</strong>
                <span>进入有边界的 AI 对话</span>
              </Link>
              <Link to="/inventory">
                <AppIcon icon={Package} size={21} />
                <strong>给它一份补给</strong>
                <span>先查看效果，再决定使用</span>
              </Link>
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
