import {
  CHARACTER_NAME,
  DEFAULT_FRIEND_LIMITS,
  canAddFriend,
  createInviteShare,
  type AcceptInviteResult
} from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { Share2, User, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import {
  acceptFriendInvite,
  friendApiMessage,
  listFriends,
  registerFriendProfile,
  removeRemoteFriend
} from "../lib/friendsApi";
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
  const mergeFriends = useAppStore((state) => state.mergeFriends);
  const [status, setStatus] = useState("");
  const [sharing, setSharing] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [pendingJoin, setPendingJoin] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const code = ensureInviteCode();
    const localFriends = useAppStore.getState().friends;
    void registerFriendProfile(code)
      .then(() =>
        Promise.all(
          localFriends.map((friend) => acceptFriendInvite(friend.id).catch(() => undefined))
        )
      )
      .then(() => listFriends())
      .then((remote) => {
        mergeFriends(
          remote.friends.map((friend) => ({ id: friend.inviteCode, nickname: friend.nickname }))
        );
      })
      .catch(() => undefined);
  }, [ensureInviteCode, mergeFriends]);

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
      await registerFriendProfile(code).catch(() => undefined);
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
    if (result !== "ok" && result !== "exists") {
      setStatus(joinMessages[result]);
      return;
    }
    setJoining(true);
    void registerFriendProfile(ensureInviteCode())
      .then(() => acceptFriendInvite(pendingJoin))
      .then(() => {
        setStatus(
          result === "exists"
            ? joinMessages.exists
            : "加入了小圈。现在可以看对方设为密友可见的朋友圈。"
        );
        clearInviteQuery();
      })
      .catch((error: unknown) => {
        setStatus(`${joinMessages[result]} ${friendApiMessage(error)}`);
        if (result === "ok" || result === "exists") clearInviteQuery();
      })
      .finally(() => setJoining(false));
  };

  const onRemove = (id: string) => {
    removeFriend(id);
    void removeRemoteFriend(id).catch(() => undefined);
  };

  return (
    <main className="friends-page">
      <header className="subpage-header">
        <BackLink to="/settings" label="返回设置" />
        <div>
          <p className="eyebrow">
            密友 · {friends.length}/{DEFAULT_FRIEND_LIMITS.maxFriends}
          </p>
          <h1>小圈</h1>
        </div>
        <span aria-hidden="true" />
      </header>

      {pendingJoin ? (
        <section className="friends-page__invite" aria-label="待处理邀请">
          <div>
            <strong>有人请你来坐坐</strong>
            <p>加入后可互看设为「密友可见」的朋友圈动态。</p>
          </div>
          <div className="friends-page__invite-actions">
            <Button loading={joining} onClick={joinInvite}>
              加入
            </Button>
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
          <p>
            最多 {DEFAULT_FRIEND_LIMITS.maxFriends}{" "}
            人。加入后可打开对方朋友圈；每条动态需对方设为密友可见。
          </p>
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
                <span className="friends-page__actions">
                  <Link
                    className="friends-page__feed"
                    to="/friends/$inviteCode"
                    params={{ inviteCode: friend.id }}
                  >
                    朋友圈
                  </Link>
                  <button
                    type="button"
                    className="friends-page__remove"
                    onClick={() => onRemove(friend.id)}
                  >
                    移除
                  </button>
                </span>
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
          用系统分享或复制链接发出去。{CHARACTER_NAME} 不会公开广场。
        </p>
      )}
    </main>
  );
}
