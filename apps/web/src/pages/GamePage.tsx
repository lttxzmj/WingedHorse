import {
  CHARACTER_NAME,
  DEFAULT_SPONSORED_CAMPAIGN,
  ITEM_CATALOG,
  sponsoredProductLabel,
  type ItemId
} from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoveHorizontal,
  Package,
  Pause,
  Play,
  Sparkles
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { ItemIcon } from "../components/ItemIcon";
import { subscribeDeviceEvents } from "../lib/devices";
import { WelfareSheet } from "../components/WelfareSheet";
import { DropGameCanvas, type GameStats, type GameSummary } from "../game/DropGameCanvas";
import { trackEvent } from "../lib/analytics";
import { ASCENDED_HORSE_ASSET, GAME_CHARACTER_ASSETS } from "../game/gameCharacterAssets";
import "../game/gameAssets.css";
import { createClientId } from "../lib/clientId";
import { useAppStore } from "../store/useAppStore";

type GamePhase = "intro" | "countdown" | "playing" | "summary";
type GameLoadState = "idle" | "loading" | "ready" | "error";

const INITIAL_STATS: GameStats = { score: 0, combo: 0, caughtCount: 0, remainingSeconds: 30 };

export function GamePage() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [gameLoadState, setGameLoadState] = useState<GameLoadState>("idle");
  const [gameError, setGameError] = useState("");
  const [controlDirection, setControlDirection] = useState<-1 | 0 | 1>(0);
  const [catchNotice, setCatchNotice] = useState("");
  const [showGuide, setShowGuide] = useState(true);
  const [welfareItem, setWelfareItem] = useState<ItemId | null>(null);
  const autoStartHandled = useRef(false);
  const settleGame = useAppStore((state) => state.settleGame);
  const gamesPlayed = useAppStore((state) => state.gamesPlayed);
  const receivedSponsoredItemIds = useAppStore((state) => state.receivedSponsoredItemIds);
  const result = useAppStore((state) => state.result);
  const hasReceivedSponsored = receivedSponsoredItemIds.includes(
    DEFAULT_SPONSORED_CAMPAIGN.boxItemId
  );
  const deviceId = useAppStore((state) => state.deviceId);
  const playing = phase === "playing";

  // Warm the Phaser chunk on the intro screen so countdown isn't blocked by a 1MB+ download.
  useEffect(() => {
    void import("phaser").catch(() => {
      // Prefetch failure is non-fatal; DropGameCanvas still handles load errors.
    });
  }, []);

  // 监听硬件超声波：如果在游戏中检测到有人靠近，自动安全暂停防窥
  useEffect(() => {
    const targetDeviceId = deviceId || "lamp-001";
    const unsubscribe = subscribeDeviceEvents(targetDeviceId, (event, telemetry) => {
      if (telemetry.obstacle && phase === "playing") {
        setPaused(true); // 自动暂停游戏，不丢分
      }
    });

    return unsubscribe;
  }, [deviceId, phase]);
  const inLiveScene = phase === "countdown" || phase === "playing";
  const sponsoredCaughtId = summary
    ? (Object.keys(summary.caught) as ItemId[]).find((itemId) => ITEM_CATALOG[itemId].sponsored)
    : undefined;
  const [countdownLeaving, setCountdownLeaving] = useState(false);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 1) {
      const launchTimer = window.setTimeout(() => {
        setCountdownLeaving(true);
        setPhase("playing");
      }, 860);
      return () => window.clearTimeout(launchTimer);
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 860);
    return () => window.clearTimeout(timer);
  }, [countdown, phase]);

  useEffect(() => {
    if (!countdownLeaving) return;
    const clearTimer = window.setTimeout(() => setCountdownLeaving(false), 220);
    return () => window.clearTimeout(clearTimer);
  }, [countdownLeaving]);

  useEffect(() => {
    if (!playing || gameLoadState !== "ready" || !showGuide) return;
    const guideTimer = window.setTimeout(() => setShowGuide(false), 3_800);
    return () => window.clearTimeout(guideTimer);
  }, [gameLoadState, playing, showGuide]);

  const start = () => {
    setSummary(null);
    setPaused(false);
    setStats(INITIAL_STATS);
    setSessionId(createClientId());
    setGameError("");
    setControlDirection(0);
    setCatchNotice("");
    setShowGuide(true);
    setWelfareItem(null);
    setGameLoadState("loading");
    trackEvent("game_start", { round: gamesPlayed + 1 });
    setCountdownLeaving(false);
    setCountdown(3);
    setPhase("countdown");
  };

  useEffect(() => {
    if (autoStartHandled.current || window.location.hash !== "#start") return;
    autoStartHandled.current = true;
    start();
  }, []);

  const finish = (nextSummary: GameSummary) => {
    settleGame(nextSummary.sessionId, nextSummary.caught);
    const sponsoredId = (Object.keys(nextSummary.caught) as ItemId[]).find(
      (itemId) => ITEM_CATALOG[itemId].sponsored
    );
    if (sponsoredId) trackEvent("sponsored_caught", { itemId: sponsoredId });
    trackEvent("game_finish", { score: nextSummary.score, caught: nextSummary.caughtCount });
    setSummary(nextSummary);
    setStats(nextSummary);
    setPaused(false);
    setControlDirection(0);
    setGameLoadState("idle");
    setPhase("summary");
  };

  const beginMove = (direction: -1 | 1) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setControlDirection(direction);
  };
  const endMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setControlDirection(0);
  };

  return (
    <main className={`game-page game-page--${phase}`}>
      <header className={`subpage-header${phase === "summary" ? " subpage-header--summary" : ""}`}>
        <BackLink to="/home" label="回到草原" />
        <div>
          <p className="eyebrow">宇宙 Online · 补给雨</p>
          <h1>接住今天的补给</h1>
        </div>
        <Link className="subpage-header__tool" to="/inventory">
          <AppIcon icon={Package} size={17} />
          <span>背包</span>
        </Link>
      </header>
      <section className={`game-shell game-shell--${phase}`}>
        {inLiveScene ? (
          <>
            {gameLoadState === "error" ? (
              <div className="game-recovery" role="alert">
                <div className="game-recovery__veil" />
                <div className="game-recovery__card">
                  <div className="game-recovery__icon" aria-hidden="true">
                    <span>!</span>
                  </div>
                  <strong>补给雨暂未开启</strong>
                  <p>{gameError || "网络或加载遇到了一点小波动，请重试。"}</p>
                  <div className="game-recovery__actions">
                    <Button onClick={start}>再试一次</Button>
                    <Link to="/home" className="quiet-link">回到草原</Link>
                  </div>
                </div>
              </div>
            ) : (
              <DropGameCanvas
                sessionId={sessionId}
                characterType={result?.typeId ?? "chosen"}
                gamesPlayed={gamesPlayed}
                hasReceivedSponsored={hasReceivedSponsored}
                paused={!playing || paused}
                controlDirection={playing ? controlDirection : 0}
                onStatsChange={setStats}
                onReady={() => setGameLoadState("ready")}
                onError={(message) => {
                  setGameError(message);
                  setPaused(false);
                  setGameLoadState("error");
                }}
                onCatch={(itemId, points) => {
                  setShowGuide(false);
                  if ("vibrate" in navigator) navigator.vibrate(18);
                  const item = ITEM_CATALOG[itemId];
                  setCatchNotice(
                    item.sponsored ? `+${points} · 合作补给` : `${item.name} +${points}`
                  );
                  window.setTimeout(() => setCatchNotice(""), 900);
                }}
                onSponsoredShown={(itemId) => trackEvent("sponsored_shown", { itemId })}
                onFinish={finish}
              />
            )}

            {phase === "countdown" || countdownLeaving ? (
              <div
                className={`game-countdown game-countdown--overlay${
                  countdownLeaving ? " is-leaving" : ""
                }`.trim()}
                aria-live="assertive"
                aria-hidden={countdownLeaving || undefined}
              >
                <div className="game-countdown__veil" />
                <div className="game-countdown__character" aria-hidden="true">
                  <img
                    src={GAME_CHARACTER_ASSETS[result?.typeId ?? "chosen"]}
                    alt=""
                  />
                </div>
                <div className="game-countdown__stage">
                  <div className="game-countdown__content" key={countdown}>
                    <p className="game-countdown__pill">
                      <span>{countdown > 1 ? "准备接住补给" : `左右拖动${CHARACTER_NAME}`}</span>
                    </p>
                    <div className="game-countdown__core">
                      <span className="game-countdown__halo" aria-hidden="true" />
                      <strong className="game-countdown__number">{countdown}</strong>
                    </div>
                  </div>
                  <div className="game-countdown__guide">
                    <span className="game-countdown__guide-arrow" aria-hidden="true">‹</span>
                    <span>左右滑动移动接物</span>
                    <span className="game-countdown__guide-arrow" aria-hidden="true">›</span>
                  </div>
                </div>
              </div>
            ) : null}

            {playing ? (
              <>
                <div className="game-hud" aria-label="本局状态">
                  <div className="game-hud__pill game-hud__pill--time">
                    <span className="game-hud__icon" aria-hidden="true">
                      <AppIcon icon={Clock3} size={15} />
                    </span>
                    <div className="game-hud__value">
                      <strong>{stats.remainingSeconds}</strong>
                      <small>秒</small>
                    </div>
                  </div>

                  <div className="game-hud__pill game-hud__pill--score">
                    <span className="game-hud__label">得分</span>
                    <div className="game-hud__value">
                      <strong>{stats.score}</strong>
                      <small>{stats.caughtCount}件</small>
                    </div>
                  </div>

                  <div className={`game-hud__pill game-hud__pill--combo${stats.combo >= 2 ? " is-hot" : ""}`}>
                    <span className="game-hud__label">连击</span>
                    <div className="game-hud__value">
                      <strong>×{Math.min(stats.combo, 10)}</strong>
                    </div>
                  </div>

                  <button
                    className="game-hud__pause-btn"
                    disabled={gameLoadState !== "ready"}
                    onClick={() => {
                      setControlDirection(0);
                      setPaused((value) => !value);
                    }}
                    aria-pressed={paused}
                    aria-label={paused ? "继续" : "暂停"}
                  >
                    <AppIcon icon={paused ? Play : Pause} size={16} />
                    <span>{paused ? "继续" : "暂停"}</span>
                  </button>

                  <div className="game-hud__progress-track" aria-hidden="true">
                    <span
                      className="game-hud__progress-bar"
                      style={{ width: `${(stats.remainingSeconds / 30) * 100}%` }}
                    />
                  </div>
                </div>
                {gameLoadState === "loading" && !countdownLeaving ? (
                  <div className="game-loading" role="status">
                    <span className="game-loading__pill">正在打开补给雨…</span>
                  </div>
                ) : null}
                {gameLoadState === "ready" ? (
                  <div className="game-controls" aria-label={`移动${CHARACTER_NAME}`}>
                    <button
                      type="button"
                      aria-label="向左移动"
                      onPointerDown={beginMove(-1)}
                      onPointerUp={endMove}
                      onPointerCancel={endMove}
                      onLostPointerCapture={() => setControlDirection(0)}
                    >
                      <AppIcon icon={ChevronLeft} size={32} strokeWidth={2.5} />
                    </button>
                    <p id="game-control-help">
                      <AppIcon icon={MoveHorizontal} size={15} />
                      按住或拖动
                    </p>
                    <button
                      type="button"
                      aria-label="向右移动"
                      onPointerDown={beginMove(1)}
                      onPointerUp={endMove}
                      onPointerCancel={endMove}
                      onLostPointerCapture={() => setControlDirection(0)}
                    >
                      <AppIcon icon={ChevronRight} size={32} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : null}
                {gameLoadState === "ready" && showGuide && !countdownLeaving ? (
                  <p className="game-play-guide" role="status">
                    {`手指贴着${CHARACTER_NAME}左右拖动，接住第一份补给`}
                  </p>
                ) : null}
                {catchNotice ? (
                  <p
                    className={`game-catch-notice${catchNotice.includes("合作补给") ? "" : " sr-only"}`}
                    role="status"
                  >
                    {catchNotice.includes("合作补给") ? catchNotice : `接住了 · ${catchNotice}`}
                  </p>
                ) : null}
                {paused ? (
                  <div className="game-pause" role="dialog" aria-modal="true" aria-label="游戏已暂停">
                    <strong>先喘口气</strong>
                    <p>倒计时和掉落都停住了。</p>
                    <Button onClick={() => setPaused(false)}>继续接住</Button>
                    <Link to="/home">结束并回草原</Link>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <div className={`game-intro${summary ? " game-intro--summary" : ""}`}>
            <div className="game-intro__character" aria-hidden="true">
              <img src={GAME_CHARACTER_ASSETS[result?.typeId ?? "chosen"]} alt="" />
            </div>
            {summary ? (
              <div className="game-summary">
                <div className="game-summary__headline">
                  <div>
                    <p className="eyebrow">补给已入袋</p>
                    <h2>接住了 {summary.caughtCount} 件</h2>
                    <p>最高 {summary.maxCombo} 连击</p>
                  </div>
                  <span>
                    <strong>{summary.score}</strong>
                    <small>本局得分</small>
                  </span>
                </div>
                <section className="game-summary__loot" aria-labelledby="game-loot-title">
                  <h3 id="game-loot-title">本局获得</h3>
                  <div className="loot-row" aria-label="本局获得物品">
                    {Object.entries(summary.caught).length ? (
                      Object.entries(summary.caught).map(([id, count]) => {
                        const itemId = id as ItemId;
                        const item = ITEM_CATALOG[itemId];
                        return (
                          <span key={id} className={item.sponsored ? "is-sponsored" : undefined}>
                            <ItemIcon itemId={itemId} size={19} />
                            <span>{item.name}</span>
                            <strong>×{count}</strong>
                          </span>
                        );
                      })
                    ) : (
                      <p>这次没接住也没关系，不扣分。</p>
                    )}
                  </div>
                </section>
                {sponsoredCaughtId ? (
                  <section className="game-summary__welfare" aria-labelledby="game-welfare-title">
                    <img
                      className="game-summary__welfare-logo"
                      src={DEFAULT_SPONSORED_CAMPAIGN.logoImage}
                      alt=""
                      width={54}
                      height={30}
                    />
                    <div>
                      <strong id="game-welfare-title">合作补给</strong>
                      <p>{sponsoredProductLabel()}</p>
                    </div>
                    <Button
                      onClick={() => {
                        trackEvent("welfare_opened", { itemId: sponsoredCaughtId });
                        setWelfareItem(sponsoredCaughtId);
                      }}
                    >
                      领牛毛
                    </Button>
                  </section>
                ) : null}
                <figure className="game-summary__ascension">
                  <img
                    src={ASCENDED_HORSE_ASSET}
                    alt="长出翅膀后的进化天马形象"
                    width="512"
                    height="512"
                  />
                  <figcaption>
                    <strong>飞升能量 +{summary.caughtCount}</strong>
                    <span>
                      {summary.maxCombo >= 5
                        ? "这次连击让天马形态闪了一下。"
                        : "继续接住补给，天马形态会慢慢靠近。"}
                    </span>
                  </figcaption>
                </figure>
                <div className="game-summary__actions">
                  <Link className="ui-button ui-button--primary" to="/home">
                    带着补给回草原
                  </Link>
                  <Button variant="secondary" onClick={start}>
                    再接一局
                  </Button>
                </div>
              </div>
            ) : null}
            {!summary ? (
              <div className="game-intro__dock">
                <div className="game-intro__brief">
                  <span className="game-intro__tag">
                    <AppIcon icon={Sparkles} size={14} />
                    今日补给雨
                  </span>
                  <h2>30 秒，把补给接回草原</h2>
                  <p>拖动{CHARACTER_NAME}接住物品；漏接不扣分。</p>
                </div>
                <div className="game-intro__actions">
                  <Button onClick={start}>开始接补给</Button>
                  <Link className="quiet-link" to="/home">
                    稍后再说
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
      {welfareItem ? <WelfareSheet itemId={welfareItem} onClose={() => setWelfareItem(null)} /> : null}
    </main>
  );
}
