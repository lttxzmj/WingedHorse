import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import {
  CHARACTER_NAME,
  getResultProfile,
  parseInviteCode,
  toCharacterSpeech
} from "@wingedhorse/domain";
import type { FriendFeedEvent } from "@wingedhorse/contracts";
import { getRouteApi, Link } from "@tanstack/react-router";
import { LockKeyhole, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { fetchFriendFeed, friendApiMessage } from "../lib/friendsApi";
import { useAppStore } from "../store/useAppStore";
import "../life-moments.css";

const friendLifeRouteApi = getRouteApi("/friends/$inviteCode");

function eventTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function FriendLifePage() {
  const { inviteCode } = friendLifeRouteApi.useParams();
  const friends = useAppStore((state) => state.friends);
  const code = parseInviteCode(inviteCode);
  const nickname = friends.find((friend) => friend.id === code)?.nickname ?? "密友";
  const [events, setEvents] = useState<FriendFeedEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("正在打开朋友圈…");

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("邀请无效。");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void fetchFriendFeed(code)
      .then((feed) => {
        if (cancelled) return;
        setEvents(feed.events);
        setStatus("ready");
        setMessage("");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(friendApiMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <main className="life-page">
      <header className="subpage-header life-header">
        <BackLink to="/friends" label="返回密友" />
        <div>
          <p className="eyebrow">{CHARACTER_NAME} · 密友可见</p>
          <h1>{nickname}的朋友圈</h1>
        </div>
      </header>
      {status === "loading" ? (
        <section className="life-empty" role="status">
          <p>正在打开朋友圈…</p>
        </section>
      ) : null}
      {status === "error" ? (
        <section className="life-empty" role="alert">
          <h2>暂时看不到</h2>
          <p>{message}</p>
          <Link className="ui-button ui-button--primary inline-link-button" to="/friends">
            回到小圈
          </Link>
        </section>
      ) : null}
      {status === "ready" && events.length === 0 ? (
        <section className="life-empty">
          <h2>还没有对你公开的动态</h2>
          <p>密友需要把单条动态设为「密友可见」，这里才会出现。</p>
        </section>
      ) : null}
      {status === "ready" && events.length > 0 ? (
        <section className="life-feed" aria-label={`${nickname}的朋友圈`}>
          {events.map((event, index) => {
            const eventProfile = getResultProfile(event.typeId);
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
                    <strong>{eventProfile.name}</strong>
                  </div>
                </header>
                <div className="life-post__content">
                  <p className="life-post__copy">
                    <strong>{toCharacterSpeech(event.title)}</strong>
                    <span>{toCharacterSpeech(event.body)}</span>
                  </p>
                  <div className="life-post__meta">
                    <time dateTime={event.occurredAt}>{eventTime(event.occurredAt)}</time>
                    <span>
                      <AppIcon
                        icon={event.visibility === "friends" ? Users : LockKeyhole}
                        size={13}
                      />
                      密友可见
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
