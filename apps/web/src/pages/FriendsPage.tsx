import {
  CHARACTER_NAME,
  DEFAULT_FRIEND_LIMITS,
  canAddFriend,
  createInviteShare,
  type AcceptInviteResult
} from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Share2, User, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { shareOrCopyInvite } from "../lib/shareInvite";
import { useAppStore } from "../store/useAppStore";
import "./friends-page.css";

const friendsRouteApi = getRouteApi("/friends");

const joinMessages: Record<AcceptInviteResult, string> = {
  ok: "加入了小圈。",
  self: "这是你自己的邀请。",
  full: "小圈满了，先移除一位。",
  exists: "已经在小圈里了。",
  invalid: "邀请无效。"
};

export function FriendsPage() {
  const navigate = useNavigate({ from: "/friends" });
  const { from } = friendsRouteApi.useSearch();
  const friends = useAppStore((state) => state.friends);
  const ensureInviteCode = useAppStore((state) => state.ensureInviteCode);
  const acceptInvite = useAppStore((state) => state.acceptInvite);
  const removeFriend = useAppStore((state) => state.removeFriend);
  const [status, setStatus] = useState("");
  const [sharing, setSharing] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [pendingJoin, setPendingJoin] = useState<string | null>(null);

  useEffect(() => {
    ensureInviteCode();
  }, [ensureInviteCode]);

  useEffect(() => {
    setPendingJoin(from ?? null);
  }, [from]);

  const slotsLeft = useMemo(
    () => Math.max(0, DEFAULT_FRIEND_LIMITS.maxFriends - friends.length),
    [friends.length]
  );
  const canInvite = canAddFriend(friends.length);

  const clearInviteQuery = () => {
    setPendingJoin(null);
    void navigate({ to: "/friends", search: {}, replace: true });
  };

  const shareInvite = async () => {
    if (!canInvite) {
      setStatus("小圈满了，先移除一位。");
      return;
    }
    const code = ensureInviteCode();
    const payload = createInviteShare(window.location.origin, code);
    setInviteUrl(payload.url);
    setSharing(true);
    try {
      const result = await shareOrCopyInvite(payload);
      if (result === "shared") setStatus("邀请已发出。");
      else if (result === "copied") setStatus("链接已复制，发给对方即可。");
      else if (result === "manual") setStatus("选中下方链接，复制发给对方。");
      else setStatus("");
    } finally {
      setSharing(false);
    }
  };

  const joinInvite = () => {
    if (!pendingJoin) return;
    const result = acceptInvite(pendingJoin);
    setStatus(joinMessages[result]);
    if (result === "ok" || result === "exists" || result === "self") clearInviteQuery();
  };

  return (
    <main className="friends-page">
      <header className="subpage-header">
        <BackLink to="/home" label="回到草原" />
        <div>
          <p className="eyebrow">密友 · {friends.length}/{DEFAULT_FRIEND_LIMITS.maxFriends}</p>
          <h1>小圈</h1>
        </div>
        <span aria-hidden="true" />
      </header>

      {pendingJoin ? (
        <section className="friends-page__invite" aria-label="待处理邀请">
          <div>
            <strong>有人请你来坐坐</strong>
            <p>{CHARACTER_NAME}的小圈只彼此可见。</p>
          </div>
          <div className="friends-page__invite-actions">
            <Button onClick={joinInvite}>加入</Button>
            <Button variant="tertiary" onClick={clearInviteQuery}>
              先不了
            </Button>
          </div>
        </section>
      ) : null}

      {friends.length === 0 ? (
        <section className="friends-page__empty" aria-label="还没有密友">
          <span className="friends-page__empty-mark" aria-hidden="true">
            <AppIcon icon={Users} size={28} />
          </span>
          <h2>还没有密友</h2>
          <p>最多 {DEFAULT_FRIEND_LIMITS.maxFriends} 人，只你们彼此看见。</p>
          <Button loading={sharing} disabled={!canInvite} onClick={() => void shareInvite()}>
            <AppIcon icon={Share2} size={18} />
            邀请
          </Button>
        </section>
      ) : (
        <>
          <ul className="friends-page__list">
            {friends.map((friend) => (
              <li key={friend.id}>
                <span className="friends-page__person">
                  <span className="friends-page__avatar" aria-hidden="true">
                    <AppIcon icon={User} size={18} />
                  </span>
                  {friend.nickname}
                </span>
                <button
                  type="button"
                  className="friends-page__remove"
                  onClick={() => removeFriend(friend.id)}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
          <div className="friends-page__footer">
            <p className="friends-page__meta">还可邀请 {slotsLeft} 人</p>
            <Button loading={sharing} disabled={!canInvite} onClick={() => void shareInvite()}>
              <AppIcon icon={Share2} size={18} />
              {canInvite ? "邀请" : "小圈已满"}
            </Button>
          </div>
        </>
      )}

      {inviteUrl ? (
        <label className="friends-page__link">
          <span>邀请链接</span>
          <input
            readOnly
            value={inviteUrl}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="邀请链接"
          />
        </label>
      ) : null}

      {status ? (
        <p className="friends-page__status" role="status">
          {status}
        </p>
      ) : (
        <p className="friends-page__hint">
          <AppIcon icon={UserPlus} size={16} />
          用系统分享或复制链接发出去。
        </p>
      )}
    </main>
  );
}
