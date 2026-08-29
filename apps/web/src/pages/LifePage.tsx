import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import {
  CHARACTER_NAME,
  deriveJourneyGoal,
  getResultProfile,
  toCharacterSpeech
} from "@wingedhorse/domain";
import { Link } from "@tanstack/react-router";
import {
  BookHeart,
  ChevronDown,
  Heart,
  LockKeyhole,
  Map,
  MessageCircle,
  Save,
  Users
} from "lucide-react";
import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { PhotoMapPanel } from "../components/PhotoMapPanel";
import { useDigitalLife } from "../hooks/useDigitalLife";
import { setLifeEventInteraction, publishLifeEventVisibility } from "../lib/lifeApi";
import { useAppStore } from "../store/useAppStore";
import "../life-moments.css";

function eventTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function characterVoice(title: string, body: string, kind: string) {
  if (kind === "visitor") {
    return {
      title: "今天有位朋友来草原坐了坐",
      body: body.replace("聊完便自己回去了", "我们聊了一会儿，它就慢悠悠地回去了")
    };
  }
  return { title: toCharacterSpeech(title), body: toCharacterSpeech(body) };
}

function eventMoodLabel(kind: string) {
  switch (kind) {
    case "game-haul":
      return "今日收获";
    case "gift":
      return "被惦记了";
    case "quiet-moment":
      return "安静一会儿";
    case "visitor":
      return "朋友来过";
    case "story":
      return "成长故事";
    default:
      return null;
  }
}

export function LifePage() {
  const [view, setView] = useState<"feed" | "map">(() =>
    typeof window !== "undefined" && window.location.hash === "#map" ? "map" : "feed"
  );
  const result = useAppStore((state) => state.result);
  const events = useAppStore((state) => state.lifeEvents);
  const gamesPlayed = useAppStore((state) => state.gamesPlayed);
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const toggleLike = useAppStore((state) => state.toggleLifeEventLike);
  const toggleSaved = useAppStore((state) => state.toggleLifeEventSaved);
  const setEventVisibility = useAppStore((state) => state.setLifeEventVisibility);
  const { lifeSyncEnabled } = useDigitalLife();
  const [visibilityHint, setVisibilityHint] = useState("");

  function interact(eventId: string, interaction: "liked" | "saved", value: boolean) {
    if (interaction === "liked") toggleLike(eventId);
    else toggleSaved(eventId);
    if (lifeSyncEnabled)
      void setLifeEventInteraction(eventId, { interaction, value }).catch(() => undefined);
  }

  function toggleVisibility(event: (typeof events)[number]) {
    const next = event.visibility === "friends" ? "private" : "friends";
    setEventVisibility(event.id, next);
    setVisibilityHint("");
    void publishLifeEventVisibility({ ...event, visibility: next }).catch(() => {
      setEventVisibility(event.id, event.visibility);
      setVisibilityHint("可见范围暂时没同步上，请稍后再试。");
    });
  }

  function switchView(next: "feed" | "map") {
    setView(next);
    window.history.replaceState(null, "", next === "map" ? "#map" : "#feed");
  }

  if (!result) {
    return (
      <main className="centered-page">
        <section className="empty-state">
          <h1>生活还没开始记录</h1>
          <p>完成测评、认识你的牛马后，这里才会出现它自己的生活。</p>
          <Link className="ui-button ui-button--primary inline-link-button" to="/assessment">
            先去认识它
          </Link>
        </section>
      </main>
    );
  }

  const profile = getResultProfile(result.typeId);
  const journey = deriveJourneyGoal({ events, gamesPlayed, relationshipXp });
  return (
    <main className="life-page">
      <header className="subpage-header life-header">
        <BackLink to="/home" label="回到草原" />
        <div>
          <p className="eyebrow">{CHARACTER_NAME} · 逐条设置可见范围</p>
          <h1>{view === "feed" ? "它的朋友圈" : "一起走过的地方"}</h1>
        </div>
      </header>
      <div className="life-view-switch" role="tablist" aria-label="生活记录视图">
        <button
          role="tab"
          aria-selected={view === "feed"}
          className={view === "feed" ? "is-active" : ""}
          onClick={() => switchView("feed")}
        >
          <AppIcon icon={BookHeart} size={18} />
          生活动态
        </button>
        <button
          role="tab"
          aria-selected={view === "map"}
          className={view === "map" ? "is-active" : ""}
          onClick={() => switchView("map")}
        >
          <AppIcon icon={Map} size={18} />
          共同足迹
        </button>
      </div>
      {view === "map" ? (
        <PhotoMapPanel />
      ) : (
        <>
          <details className="journey-card life-pinned-story" id="journey">
            <summary>
              <div className="life-pinned-story__title-wrap">
                <span className="life-pinned-story__badge">共同远行</span>
                <strong id="journey-title">{journey.title}</strong>
              </div>
              <div className="life-pinned-story__action-wrap">
                <span
                  className="life-pinned-story__counter"
                  aria-label={`已完成 ${journey.completedCount} 项，共 ${journey.totalCount} 项`}
                >
                  {journey.completedCount}/{journey.totalCount}
                </span>
                <AppIcon icon={ChevronDown} size={16} />
              </div>
            </summary>
            <div className="life-pinned-story__body">
              <p className="life-pinned-story__desc">{journey.description}</p>
              <div
                className="journey-track"
                role="progressbar"
                aria-label="共同远行进展"
                aria-valuemin={0}
                aria-valuemax={journey.totalCount}
                aria-valuenow={journey.completedCount}
              >
                {journey.milestones.map((milestone, idx) => (
                  <div
                    className={`journey-node ${milestone.completed ? "is-complete" : ""}`}
                    key={milestone.id}
                  >
                    <div className="journey-node__dot">
                      {milestone.completed ? (
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                          className="journey-node__check"
                        >
                          <path
                            d="M3.5 8.5L6.5 11.5L12.5 4.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span className="journey-node__index">{idx + 1}</span>
                      )}
                    </div>
                    <span className="journey-node__label">{milestone.label}</span>
                  </div>
                ))}
              </div>
              <div className="journey-card__next">
                <span className="journey-card__next-indicator" aria-hidden="true" />
                <p>{journey.nextPrompt}</p>
              </div>
            </div>
          </details>
          {events.length === 0 ? (
            <section className="life-empty">
              <WingedHorseCharacter typeId={result.typeId} mood={profile.mood} alt={profile.name} />
              <h2>草原刚安静下来</h2>
              <p>玩一局或送份补给，新动态会出现在这里。</p>
              <Link className="ui-button ui-button--primary inline-link-button" to="/home">
                回草原看看
              </Link>
            </section>
          ) : (
            <section className="life-feed" aria-label="来来最近动态">
              <div className="life-feed__heading">
                <p className="eyebrow">最近</p>
                <span>{events.length} 条</span>
              </div>
              {visibilityHint ? (
                <p className="life-feed__hint" role="status">
                  {visibilityHint}
                </p>
              ) : (
                <p className="life-feed__hint">默认仅自己可见。点「仅自己」可分享给密友。</p>
              )}
              {events.map((event, index) => {
                const eventProfile = getResultProfile(event.typeId);
                const voice = characterVoice(event.title, event.body, event.kind);
                const visitorProfile = event.visitorTypeId
                  ? getResultProfile(event.visitorTypeId)
                  : null;
                return (
                  <article
                    className={`life-post life-post--${event.kind} ${index === 0 ? "life-post--featured" : "life-post--compact"}`}
                    key={event.id}
                  >
                    <header>
                      <WingedHorseCharacter
                        typeId={event.typeId}
                        mood={event.kind === "quiet-moment" ? "resting" : eventProfile.mood}
                        alt=""
                      />
                      <div>
                        <strong>
                          {event.kind === "visitor" && visitorProfile
                            ? `${profile.name}和${visitorProfile.name}`
                            : eventProfile.name}
                        </strong>
                        {eventMoodLabel(event.kind) ? (
                          <span>{eventMoodLabel(event.kind)}</span>
                        ) : null}
                      </div>
                    </header>
                    <div className="life-post__content">
                      <p className="life-post__copy">
                        <strong>{voice.title}</strong>
                        <span>{voice.body}</span>
                      </p>
                      {index === 0 ? (
                        <div
                          className={`life-post__scene life-post__scene--${event.kind}`}
                          aria-hidden="true"
                        >
                          <div className="life-post__characters">
                            <WingedHorseCharacter
                              typeId={event.typeId}
                              mood={eventProfile.mood}
                              alt=""
                            />
                            {visitorProfile && event.visitorTypeId ? (
                              <WingedHorseCharacter
                                typeId={event.visitorTypeId}
                                mood={visitorProfile.mood}
                                alt=""
                              />
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <div className="life-post__meta">
                        <time dateTime={event.occurredAt}>{eventTime(event.occurredAt)}</time>
                        {event.kind === "visitor" ? <span>AI 访客</span> : null}
                        <button
                          type="button"
                          className={
                            event.visibility === "friends"
                              ? "life-post__visibility is-friends"
                              : "life-post__visibility"
                          }
                          aria-pressed={event.visibility === "friends"}
                          aria-label={
                            event.visibility === "friends"
                              ? "当前密友可见，点击改为仅自己"
                              : "当前仅自己可见，点击设为密友可见"
                          }
                          onClick={() => toggleVisibility(event)}
                        >
                          <AppIcon
                            icon={event.visibility === "friends" ? Users : LockKeyhole}
                            size={13}
                          />
                          {event.visibility === "friends" ? "密友可见" : "仅自己"}
                        </button>
                      </div>
                      <footer>
                        <button
                          className={event.liked ? "is-active" : ""}
                          aria-pressed={event.liked}
                          aria-label={event.liked ? "已抱住" : "抱住"}
                          onClick={() => interact(event.id, "liked", !event.liked)}
                        >
                          <AppIcon icon={Heart} size={17} />
                          {event.liked ? "已抱住" : "抱住"}
                        </button>
                        <button
                          className={event.saved ? "is-active" : ""}
                          aria-pressed={event.saved}
                          aria-label={event.saved ? "已存进共同记忆" : "存进共同记忆"}
                          onClick={() => interact(event.id, "saved", !event.saved)}
                        >
                          <AppIcon icon={Save} size={17} />
                          {event.saved ? "已收藏" : "收藏"}
                        </button>
                        <Link to="/companion" aria-label="回它一句">
                          <AppIcon icon={MessageCircle} size={17} />
                          回一句
                        </Link>
                      </footer>
                      {event.liked || event.saved ? (
                        <p className="life-post__reactions" aria-live="polite">
                          {event.liked ? "抱住了" : null}
                          {event.liked && event.saved ? " · " : null}
                          {event.saved ? "已收藏" : null}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
}
