import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { CHARACTER_NAME, deriveJourneyGoal, getResultProfile } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import {
  BookHeart,
  ChevronDown,
  Heart,
  LockKeyhole,
  Map,
  MessageCircle,
  Navigation,
  Save,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { PhotoMapPanel } from "../components/PhotoMapPanel";
import { useDigitalLife } from "../hooks/useDigitalLife";
import { setLifeEventInteraction } from "../lib/lifeApi";
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
      body: body.replace(
        "聊完便自己回去了",
        "我们聊了一会儿，它就慢悠悠地回去了"
      )
    };
  }
  const rewrite = (value: string) =>
    value
      .replaceAll("你们", "我们")
      .replaceAll("它们", "我们")
      .replaceAll("它", "我")
      .replaceAll("你和我", "我们");
  return { title: rewrite(title), body: rewrite(body) };
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
  const { lifeSyncEnabled, syncState } = useDigitalLife();

  function interact(eventId: string, interaction: "liked" | "saved", value: boolean) {
    if (interaction === "liked") toggleLike(eventId);
    else toggleSaved(eventId);
    if (lifeSyncEnabled)
      void setLifeEventInteraction(eventId, { interaction, value }).catch(() => undefined);
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
          <p className="eyebrow">{CHARACTER_NAME} · 只给你看</p>
          <h1>{view === "feed" ? "它的朋友圈" : "一起走过的地方"}</h1>
        </div>
      </header>
      <aside className="life-boundary life-boundary--compact life-moments-privacy">
        <AppIcon icon={ShieldCheck} size={19} />
        <div>
          <strong>这是你们的小世界</strong>
          <span role="status">
            {lifeSyncEnabled
              ? syncState === "synced"
                ? "动态已备份，照片仍只留在本机"
                : syncState === "offline"
                  ? "暂时离线，这些记忆还好好留在本机"
                  : "正在收好这些动态，照片不会上传"
              : "动态和照片目前只保存在这台设备"}
          </span>
        </div>
        <Link to="/settings" aria-label="打开朋友圈隐私设置">
          <AppIcon icon={LockKeyhole} size={16} />
          <span>隐私</span>
        </Link>
      </aside>
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
              <span className="life-pinned-story__icon" aria-hidden="true">
                <AppIcon icon={Sparkles} size={18} />
              </span>
              <span>
                <small>置顶故事 · 我们的航线</small>
                <strong id="journey-title">{journey.title}</strong>
              </span>
              <b aria-label={`已完成 ${journey.completedCount} 项，共 ${journey.totalCount} 项`}>
                {journey.completedCount}/{journey.totalCount}
              </b>
              <AppIcon icon={ChevronDown} size={18} />
            </summary>
            <div className="life-pinned-story__body">
              <p>{journey.description}</p>
              <div
                className="journey-track"
                role="progressbar"
                aria-label="共同远行进展"
                aria-valuemin={0}
                aria-valuemax={journey.totalCount}
                aria-valuenow={journey.completedCount}
              >
                {journey.milestones.map((milestone) => (
                  <span className={milestone.completed ? "is-complete" : ""} key={milestone.id}>
                    <i aria-hidden="true">{milestone.completed ? "✓" : "·"}</i>
                    <small>{milestone.label}</small>
                  </span>
                ))}
              </div>
              <p className="journey-card__next">
                <AppIcon icon={Navigation} size={16} /> {journey.nextPrompt}
              </p>
            </div>
          </details>
          {events.length === 0 ? (
            <section className="life-empty">
              <WingedHorseCharacter typeId={result.typeId} mood={profile.mood} alt={profile.name} />
              <h2>草原刚安静下来</h2>
              <p>玩一局、送一份补给或摸摸它，新的共同记录就会出现在这里。</p>
              <Button onClick={() => history.back()}>回草原看看</Button>
            </section>
          ) : (
            <section className="life-feed" aria-label="数字生命最近动态">
              <div className="life-feed__heading">
                <div>
                  <p className="eyebrow">最近的碎碎念</p>
                  <strong>它不在等你打卡，只是偶尔想告诉你</strong>
                </div>
                <span>{events.length} 条</span>
              </div>
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
                        {eventMoodLabel(event.kind) ? <span>{eventMoodLabel(event.kind)}</span> : null}
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
                      <span>
                        <AppIcon icon={LockKeyhole} size={13} />
                        {event.kind === "visitor" ? "有位 AI 朋友来过 · 仅你可见" : "仅你可见"}
                      </span>
                    </div>
                    <footer>
                      <button
                        className={event.liked ? "is-active" : ""}
                        aria-pressed={event.liked}
                        aria-label={event.liked ? "已接住" : "接住这刻"}
                        onClick={() => interact(event.id, "liked", !event.liked)}
                      >
                        <AppIcon icon={Heart} size={17} />
                        {event.liked ? "已抱住" : "抱住这刻"}
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
                      <Link to="/companion">
                        <AppIcon icon={MessageCircle} size={17} />
                        回它一句
                      </Link>
                    </footer>
                    {event.liked || event.saved ? (
                      <p className="life-post__reactions" aria-live="polite">
                        {event.liked ? "你抱住了这一刻" : null}
                        {event.liked && event.saved ? " · " : null}
                        {event.saved ? "已经收进共同记忆" : null}
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
