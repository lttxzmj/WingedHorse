import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { deriveJourneyGoal, getResultProfile } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { useDigitalLife } from "../hooks/useDigitalLife";

function relationshipLabel(value: number) {
  if (value >= 60) return "并肩老友";
  if (value >= 25) return "默契搭子";
  if (value >= 10) return "熟悉伙伴";
  return "刚刚同行";
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
  const journey = deriveJourneyGoal({ events: lifeEvents, gamesPlayed, relationshipXp });
  const greeting =
    worldContext?.period === "morning"
      ? "早上好"
      : worldContext?.period === "afternoon"
        ? "下午好"
        : worldContext?.period === "night"
          ? "夜深了"
          : "晚上好";
  return (
    <main className="home-page home-page--immersive">
      <header className="home-header">
        <div>
          <p className="eyebrow">你的飞马草原</p>
          <h1>{greeting}，先喘口气。</h1>
        </div>
        <div className="home-header__tools">
          <Link
            className="icon-button"
            aria-label={`打开背包，共 ${inventoryCount} 件`}
            to="/inventory"
          >
            包<small>{inventoryCount}</small>
          </Link>
          <Link className="icon-button" aria-label="打开生活簿" to="/life">
            簿
          </Link>
          <Link className="icon-button" aria-label="打开设置" to="/settings">
            设
          </Link>
        </div>
      </header>

      <section className="lawn-stage lawn-stage--alive" aria-label="飞马生活草原">
        <div className="lawn-stage__sun" aria-hidden="true" />
        <p className="lawn-stage__bubble" aria-live="polite">
          {reaction ||
            latestStoryEvent?.body ||
            latestAutonomousEvent?.body ||
            "我不会催你。想一起做件小事，还是先休息？"}
        </p>
        <button
          ref={characterButtonRef}
          className="character-hotspot"
          onClick={() => setInteractionOpen(true)}
          aria-label={`和${profile.name}互动`}
        >
          <WingedHorseCharacter mood={profile.mood} typeId={result.typeId} alt={profile.name} />
          <span>点点我</span>
        </button>
        {latestStoryEvent?.kind === "visitor" ? (
          <Link className="scene-whisper" to="/life">
            有位 AI 牛马来坐过
          </Link>
        ) : null}
        <div className="tent" aria-label="飞马休息的小帐篷">
          <span aria-hidden="true">休</span>
        </div>
        <div className="lawn-progress" aria-label="同行进展">
          <div>
            <span>{relationshipLabel(relationshipXp)}</span>
            <strong>同行值 {relationshipXp}</strong>
          </div>
          <Link
            to="/life"
            hash="journey"
            aria-label={`查看共同远行计划，已完成 ${journey.completedCount} 项`}
          >
            远行计划 {journey.completedCount}/{journey.totalCount}
          </Link>
        </div>
      </section>

      <section className={`daily-event ${taskDone ? "daily-event--done" : ""}`}>
        <div>
          <p className="eyebrow">{taskDone ? "今天已经接住" : "今天的一件小事"}</p>
          <h2>{taskDone ? "补给已经安全到家" : "陪我接一场 30 秒补给雨"}</h2>
          <p>
            {taskDone
              ? "不用继续打卡。你可以把补给给飞马，也可以留在背包里。"
              : "漏接不扣状态，完成第一局会增加 8 点同行值。"}
          </p>
        </div>
        <Link
          className="ui-button ui-button--primary inline-link-button"
          to={taskDone ? "/inventory" : "/game"}
        >
          {taskDone ? "看看补给" : "一起去接"}
        </Link>
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
              ×
            </button>
            <p className="eyebrow">{relationshipLabel(relationshipXp)} · AI 飞马</p>
            <h2 id="interaction-title">现在想怎么陪它？</h2>
            <p>互动不会影响你的测评类型，也不会因为离开而扣分。</p>
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
                <strong>{comforted ? "已经摸过啦" : "摸摸它"}</strong>
                <span>给一个安静回应</span>
              </button>
              <Link to="/companion">
                <strong>递张小纸条</strong>
                <span>进入有边界的 AI 对话</span>
              </Link>
              <Link to="/inventory">
                <strong>给它一份补给</strong>
                <span>先查看效果，再决定使用</span>
              </Link>
              <Link to="/signals">
                <strong>告诉它现在的状态</strong>
                <span>可以只手动选择，不开镜头</span>
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
