import { ITEM_CATALOG, type ItemId } from "@wingedhorse/domain";
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
import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { ItemIcon } from "../components/ItemIcon";
import { DropGameCanvas, type GameStats, type GameSummary } from "../game/DropGameCanvas";
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
  const settleGame = useAppStore((state) => state.settleGame);
  const result = useAppStore((state) => state.result);
  const playing = phase === "playing";

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      const launchTimer = window.setTimeout(() => setPhase("playing"), 480);
      return () => window.clearTimeout(launchTimer);
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 860);
    return () => window.clearTimeout(timer);
  }, [countdown, phase]);

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
    setGameLoadState("loading");
    setCountdown(3);
    setPhase("countdown");
  };

  const finish = (nextSummary: GameSummary) => {
    settleGame(nextSummary.sessionId, nextSummary.caught);
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
      <header className="subpage-header">
        <BackLink to="/home" label="回到草原" />
        <div>
          <p className="eyebrow">宇宙 Online · 补给雨</p>
          <h1>接住今天的补给</h1>
        </div>
        <Link className="subpage-header__tool" to="/inventory">
          <AppIcon icon={Package} size={17} />
          背包
        </Link>
      </header>
      <section className={`game-shell game-shell--${phase}`}>
        {playing ? (
          <>
            <div className="game-hud" aria-label="本局状态">
              <span className="game-hud__time">
                <AppIcon icon={Clock3} size={15} />
                <strong>{stats.remainingSeconds}</strong>
                <small>秒</small>
              </span>
              <span>
                <small>得分 · {stats.caughtCount} 件</small>
                <strong>{stats.score}</strong>
              </span>
              <span className={stats.combo >= 2 ? "is-hot" : ""}>
                <small>连击</small>
                <strong>×{Math.min(stats.combo, 10)}</strong>
              </span>
              <button
                disabled={gameLoadState !== "ready"}
                onClick={() => {
                  setControlDirection(0);
                  setPaused((value) => !value);
                }}
                aria-pressed={paused}
              >
                <AppIcon icon={paused ? Play : Pause} size={16} />
                <span>{paused ? "继续" : "暂停"}</span>
              </button>
              <span className="game-time-progress">
                <i style={{ width: `${(stats.remainingSeconds / 30) * 100}%` }} />
              </span>
            </div>
            {gameLoadState === "error" ? (
              <div className="game-recovery" role="alert">
                <strong>补给雨还没打开</strong>
                <p>{gameError}</p>
                <Button onClick={start}>再试一次</Button>
                <Link to="/home">回到草原</Link>
              </div>
            ) : (
              <>
                <DropGameCanvas
                  sessionId={sessionId}
                  characterType={result?.typeId ?? "chosen"}
                  paused={paused}
                  controlDirection={controlDirection}
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
                    setCatchNotice(`${ITEM_CATALOG[itemId].name} +${points}`);
                    window.setTimeout(() => setCatchNotice(""), 900);
                  }}
                  onFinish={finish}
                />
                {gameLoadState === "loading" ? (
                  <div className="game-loading" role="status">
                    正在打开补给雨…
                  </div>
                ) : null}
                {gameLoadState === "ready" ? (
                  <div className="game-controls" aria-label="移动飞马">
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
                {gameLoadState === "ready" && showGuide ? (
                  <p className="game-play-guide" role="status">
                    手指贴着飞马左右拖动，接住第一份补给
                  </p>
                ) : null}
                {catchNotice ? (
                  <p className="game-catch-notice sr-only" role="status">
                    接住了 · {catchNotice}
                  </p>
                ) : null}
              </>
            )}
            {paused ? (
              <div className="game-pause" role="dialog" aria-modal="true" aria-label="游戏已暂停">
                <strong>先喘口气</strong>
                <p>倒计时和掉落都停住了。</p>
                <Button onClick={() => setPaused(false)}>继续接住</Button>
                <Link to="/home">结束并回草原</Link>
              </div>
            ) : null}
          </>
        ) : phase === "countdown" ? (
          <div className="game-countdown" aria-live="assertive">
            <img className="game-scene__tent" src="/scene/prairie-tent.webp" alt="" />
            <img
              className="game-countdown__character"
              src={GAME_CHARACTER_ASSETS[result?.typeId ?? "chosen"]}
              alt=""
            />
            <div className="game-countdown__veil" />
            <div className="game-countdown__content" key={countdown}>
              <small>{countdown ? "补给雨马上到" : "去接住它"}</small>
              <strong>{countdown || "开始"}</strong>
              <p>{countdown > 1 ? "稳住，先看落点" : "手指左右拖动飞马"}</p>
            </div>
          </div>
        ) : (
          <div className={`game-intro${summary ? " game-intro--summary" : ""}`}>
            <img className="game-scene__tent" src="/scene/prairie-tent.webp" alt="" />
            <div className="game-intro__character" aria-hidden="true">
              <img src={GAME_CHARACTER_ASSETS[result?.typeId ?? "chosen"]} alt="" />
            </div>
            {summary ? (
              <div className="game-summary">
                <p className="eyebrow">本局得分</p>
                <strong>{summary.score}</strong>
                <p>最高 {summary.maxCombo} 连击 · 接住后已一次性放入背包</p>
                <div className="loot-row" aria-label="本局获得物品">
                  {Object.entries(summary.caught).length ? (
                    Object.entries(summary.caught).map(([id, count]) => (
                      <span key={id}>
                        <ItemIcon itemId={id as ItemId} size={17} />
                        {ITEM_CATALOG[id as ItemId].name} × {count}
                      </span>
                    ))
                  ) : (
                    <p>这次没有接住也没关系，不扣分，也不会影响飞马。</p>
                  )}
                </div>
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
              </div>
            ) : (
              <div className="game-intro__brief">
                <span className="game-intro__tag">
                  <AppIcon icon={Sparkles} size={14} />
                  今日补给雨
                </span>
                <h2>30 秒，把补给接回草原</h2>
                <ul>
                  <li>第一件会落在你附近</li>
                  <li>连续接住，得分最高 ×10</li>
                  <li>漏接不扣分，随时能暂停</li>
                </ul>
              </div>
            )}
            <Button onClick={start}>
              <AppIcon icon={summary ? Play : Sparkles} size={17} />
              {summary ? "再接一局" : "开始接补给"}
            </Button>
            {summary ? (
              <Link className="quiet-link" to="/home">
                带着补给回草原
              </Link>
            ) : (
              <Link className="quiet-link" to="/home">
                今天先不玩
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
