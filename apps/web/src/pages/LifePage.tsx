import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { getResultProfile } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
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
  const result = useAppStore((state) => state.result);
  const events = useAppStore((state) => state.lifeEvents);
  const toggleLike = useAppStore((state) => state.toggleLifeEventLike);
  const toggleSaved = useAppStore((state) => state.toggleLifeEventSaved);
  const { lifeSyncEnabled, syncState } = useDigitalLife();

  function interact(eventId: string, interaction: "liked" | "saved", value: boolean) {
    if (interaction === "liked") toggleLike(eventId);
    else toggleSaved(eventId);
    if (lifeSyncEnabled)
      void setLifeEventInteraction(eventId, { interaction, value }).catch(() => undefined);
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
  return (
    <main className="life-page">
      <header className="subpage-header life-header">
        <Link to="/home" aria-label="回到草原">
          ←
        </Link>
        <div>
          <p className="eyebrow">{profile.name}的私密生活簿</p>
          <h1>它今天也在生活</h1>
        </div>
      </header>
      <aside className="life-boundary">
        这里只记录你和数字生命之间的结构化事件，不是公开朋友圈，也不会被推荐给陌生人。
        <span role="status">
          {lifeSyncEnabled
            ? syncState === "synced"
              ? " 已备份到 WingedHorse 服务端。"
              : syncState === "offline"
                ? " 服务端暂不可用，本机记录仍然完整。"
                : " 正在同步本机记录……"
            : " 当前仅保存在这台设备。"}
        </span>
      </aside>
      {events.length === 0 ? (
        <section className="life-empty">
          <WingedHorseCharacter typeId={result.typeId} mood={profile.mood} alt={profile.name} />
          <h2>草原刚安静下来</h2>
          <p>玩一局、送一份补给或摸摸它，新的共同记录就会出现在这里。</p>
          <Button onClick={() => history.back()}>回草原看看</Button>
        </section>
      ) : (
        <section className="life-feed" aria-label="数字生命最近动态">
          {events.map((event) => {
            const eventProfile = getResultProfile(event.typeId);
            const visitorProfile = event.visitorTypeId
              ? getResultProfile(event.visitorTypeId)
              : null;
            return (
              <article className={`life-post life-post--${event.kind}`} key={event.id}>
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
                  <span>{event.kind === "visitor" ? "AI 访客 · 仅自己可见" : "仅自己可见"}</span>
                </header>
                <div
                  className={`life-post__scene life-post__scene--${event.kind}`}
                  aria-hidden="true"
                >
                  <div className="life-post__characters">
                    <WingedHorseCharacter typeId={event.typeId} mood={eventProfile.mood} alt="" />
                    {visitorProfile && event.visitorTypeId ? (
                      <WingedHorseCharacter
                        typeId={event.visitorTypeId}
                        mood={visitorProfile.mood}
                        alt=""
                      />
                    ) : null}
                  </div>
                </div>
                <h2>{event.title}</h2>
                <p>{event.body}</p>
                <footer>
                  <button
                    className={event.liked ? "is-active" : ""}
                    aria-pressed={event.liked}
                    onClick={() => interact(event.id, "liked", !event.liked)}
                  >
                    {event.liked ? "已接住" : "接住这刻"}
                  </button>
                  <button
                    className={event.saved ? "is-active" : ""}
                    aria-pressed={event.saved}
                    onClick={() => interact(event.id, "saved", !event.saved)}
                  >
                    {event.saved ? "已存进共同记忆" : "存进共同记忆"}
                  </button>
                  <Link to="/companion">递张小纸条</Link>
                </footer>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
