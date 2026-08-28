import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import {
  ITEM_CATALOG,
  deriveCompanionGrowth,
  getResultProfile,
  recommendCareItem
} from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookHeart,
  ChevronRight,
  CloudSun,
  Gamepad2,
  Hand,
  Heart,
  MessageCircle,
  Package,
  Settings,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { useDigitalLife } from "../hooks/useDigitalLife";
import { useAppStore } from "../store/useAppStore";
import "../cultivation.css";
import "../digital-life-experience.css";

function momentTime(value: string | undefined) {
  if (!value) return "现在";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

export function DigitalLifeExperiencePage() {
  const navigate = useNavigate();
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [reaction, setReaction] = useState<{ id: number; message: string } | null>(null);
  const characterButtonRef = useRef<HTMLButtonElement>(null);
  const interactionTriggerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasInteractionOpen = useRef(false);
  const result = useAppStore((state) => state.result);
  const inventory = useAppStore((state) => state.inventory);
  const inventoryCount = useAppStore((state) =>
    Object.values(state.inventory).reduce((sum, count) => sum + (count ?? 0), 0)
  );
  const gamesPlayed = useAppStore((state) => state.gamesPlayed);
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const lifeEvents = useAppStore((state) => state.lifeEvents);
  const petVitals = useAppStore((state) => state.petVitals);
  const worldContext = useAppStore((state) => state.worldContext);
  const useItem = useAppStore((state) => state.useItem);
  const comfortPet = useAppStore((state) => state.comfortPet);
  useDigitalLife();

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
  const recommendedItemId = recommendCareItem(inventory, petVitals);
  const comfortedToday = lifeEvents.some(
    (event) => event.eventKey === `quiet-moment:${new Date().toISOString().slice(0, 10)}`
  );
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
  const openInteraction = (trigger: HTMLElement) => {
    interactionTriggerRef.current = trigger;
    setInteractionOpen(true);
  };
  const showReaction = (message: string) => setReaction({ id: Date.now(), message });

  return (
    <main className="home-page home-page--immersive">
      <header className="home-header home-header--quiet digital-life-header">
        <div className="home-header__identity">
          <p className="eyebrow">你的数字生命</p>
          <h1>{profile.name}</h1>
          <span className="digital-life-presence">
            <i aria-hidden="true" />
            {periodLabel} · {growth.name}阶段 · AI 飞马
          </span>
        </div>
        <nav className="home-header__tools" aria-label="数字生命常用入口">
          <Link
            className="home-tool-link"
            aria-label={`打开背包，共 ${inventoryCount} 件`}
            to="/inventory"
          >
            <AppIcon icon={Package} size={18} />
            <span>背包</span>
            {inventoryCount > 0 ? <small>{inventoryCount}</small> : null}
          </Link>
          <Link className="home-tool-link" to="/settings" aria-label="打开设置与隐私">
            <AppIcon icon={Settings} size={18} />
            <span>设置</span>
          </Link>
        </nav>
      </header>

      <section
        className="lawn-stage lawn-stage--alive digital-life-stage"
        aria-label="飞马生活草原"
      >
        <div className="prairie-status prairie-status--now" aria-label="飞马当前状态">
          <AppIcon icon={CloudSun} size={15} />
          <span>{periodLabel} · {growth.relationshipLabel}</span>
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
              "我不会催你。想说点什么，还是先在草原坐一会儿？"}
          </span>
        </p>
        <button
          ref={characterButtonRef}
          className={`character-hotspot ${reaction ? "is-cared-for" : ""}`.trim()}
          onClick={(event) => openInteraction(event.currentTarget)}
          aria-label={`和${profile.name}互动`}
        >
          <WingedHorseCharacter
            key={reaction?.id ?? "rest"}
            mood={profile.mood}
            typeId={result.typeId}
            alt={profile.name}
          />
        </button>
        <div className="digital-life-actions" aria-label="和飞马互动">
          <Link className="digital-life-actions__talk" to="/companion" aria-label="进入飞马对话">
            <AppIcon icon={MessageCircle} size={20} />
            <span>
              <strong>和它说句话</strong>
              <small>它会回应，也会记住你</small>
            </span>
          </Link>
          <button
            className="digital-life-actions__care"
            onClick={(event) => openInteraction(event.currentTarget)}
          >
            <AppIcon icon={Hand} size={20} />
            <span>照顾</span>
          </button>
          <Link
            className="digital-life-actions__journal"
            to="/life"
            aria-label="打开共同生活簿"
          >
            <AppIcon icon={BookHeart} size={20} />
            <span>生活簿</span>
          </Link>
        </div>
      </section>

      <section className="digital-life-continuity" aria-labelledby="growth-title">
        <div className="digital-life-continuity__growth">
          <div>
            <p className="eyebrow">共同生活 · {growth.relationshipLabel}</p>
            <h2 id="growth-title">{growth.name}阶段</h2>
          </div>
          <Link to="/life">查看共同生活</Link>
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
          <small>{growth.description}</small>
        </div>
        <div className="digital-life-continuity__activity">
          <span className="digital-life-continuity__activity-icon" aria-hidden="true">
            <AppIcon icon={inventoryCount > 0 ? Package : Gamepad2} size={20} />
          </span>
          <div>
            <p>{inventoryCount > 0 ? "背包里有新东西" : "今天可以一起做"}</p>
            <strong>
              {inventoryCount > 0
                ? "选一份补给，看看它的真实反应"
                : gamesPlayed > 0
                  ? "再接一场 30 秒补给雨"
                  : "接住第一份补给，带回草原"}
            </strong>
          </div>
          {inventoryCount > 0 ? (
            <Link to="/inventory" aria-label="去照顾：选一份补给给它">
              <span>去照顾</span>
              <AppIcon icon={ChevronRight} size={18} />
            </Link>
          ) : (
            <Link to="/game" hash="start" aria-label="开始游戏">
              <span>开始</span>
              <AppIcon icon={ChevronRight} size={18} />
            </Link>
          )}
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
            <p className="eyebrow">{growth.relationshipLabel} · 陪伴</p>
            <h2 id="interaction-title">陪它做一件小事</h2>
            <p>不需要打卡，也不会因为离开而扣分。它会记得每一次真实互动。</p>
            <div className="interaction-options interaction-options--care">
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
    </main>
  );
}
