import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { deriveJourneyGoal, getResultProfile } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { BookHeart, Heart, Map, MessageCircle, Navigation, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { PhotoMapPanel } from "../components/PhotoMapPanel";
import { useDigitalLife } from "../hooks/useDigitalLife";
import { setLifeEventInteraction } from "../lib/lifeApi";
import { useAppStore } from "../store/useAppStore";

function eventTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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
          <p className="eyebrow">{profile.name}的私密生活簿</p>
          <h1>{view === "feed" ? "它今天也在生活" : "一起走过的地方"}</h1>
        </div>
      </header>
      <aside className="life-boundary life-boundary--compact">
        <AppIcon icon={ShieldCheck} size={19} />
        <div>
          <strong>只属于你们</strong>
          <span role="status">
            {lifeSyncEnabled
              ? syncState === "synced"
                ? "生活事件已备份；照片仍只在本机"
                : syncState === "offline"
                  ? "服务暂不可用，本机记录仍然完整"
                  : "正在同步生活事件；照片不会上传"
              : "生活事件和照片当前仅保存在这台设备"}
          </span>
        </div>
        <Link to="/settings">隐私设置</Link>
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
          <section className="journey-card" id="journey" aria-labelledby="journey-title">
            <div className="journey-card__heading">
              <div>
                <p className="eyebrow">共同远行 · 没有期限</p>
                <h2 id="journey-title">{journey.title}</h2>
              </div>
              <strong
                aria-label={`已完成 ${journey.completedCount} 项，共 ${journey.totalCount} 项`}
              >
                {journey.completedCount}/{journey.totalCount}
              </strong>
            </div>
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
          </section>
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
                <p className="eyebrow">最近发生</p>
                <span>{events.length} 段共同生活</span>
              </div>
              {events.map((event, index) => {
                const eventProfile = getResultProfile(event.typeId);
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
                        <time dateTime={event.occurredAt}>{eventTime(event.occurredAt)}</time>
                      </div>
                      <span>
                        {event.kind === "visitor" ? "AI 访客 · 仅自己可见" : "仅自己可见"}
                      </span>
                    </header>
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
                    <h2>{event.title}</h2>
                    <p>{event.body}</p>
                    <footer>
                      <button
                        className={event.liked ? "is-active" : ""}
                        aria-pressed={event.liked}
                        onClick={() => interact(event.id, "liked", !event.liked)}
                      >
                        <AppIcon icon={Heart} size={17} />
                        {event.liked ? "已接住" : "接住这刻"}
                      </button>
                      <button
                        className={event.saved ? "is-active" : ""}
                        aria-pressed={event.saved}
                        onClick={() => interact(event.id, "saved", !event.saved)}
                      >
                        <AppIcon icon={Save} size={17} />
                        {event.saved ? "已存进共同记忆" : "存进共同记忆"}
                      </button>
                      <Link to="/companion">
                        <AppIcon icon={MessageCircle} size={17} />
                        递张小纸条
                      </Link>
                    </footer>
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
