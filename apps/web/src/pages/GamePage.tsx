import { ITEM_CATALOG, type ItemId } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DropGameCanvas, type GameStats, type GameSummary } from "../game/DropGameCanvas";
import { useAppStore } from "../store/useAppStore";

type GamePhase = "intro" | "countdown" | "playing" | "summary";

const INITIAL_STATS: GameStats = { score: 0, combo: 0, remainingSeconds: 30 };

export function GamePage() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const settleGame = useAppStore((state) => state.settleGame);
  const result = useAppStore((state) => state.result);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      setPhase("playing");
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 700);
    return () => window.clearTimeout(timer);
  }, [countdown, phase]);

  const start = () => {
    setSummary(null);
    setPaused(false);
    setStats(INITIAL_STATS);
    setSessionId(crypto.randomUUID());
    setCountdown(3);
    setPhase("countdown");
  };

  const finish = (nextSummary: GameSummary) => {
    settleGame(nextSummary.sessionId, nextSummary.caught);
    setSummary(nextSummary);
    setStats(nextSummary);
    setPaused(false);
    setPhase("summary");
  };

  const playing = phase === "playing";

  return (
    <main className="game-page">
      <header className="subpage-header">
        <Link to="/home" aria-label="回到草坪">
          ←
        </Link>
        <div>
          <p className="eyebrow">宇宙 Online · 补给雨</p>
          <h1>接住今天的补给</h1>
        </div>
        <Link to="/inventory">背包</Link>
      </header>
      <section className="game-shell">
        {playing ? (
          <>
            <div className="game-hud" aria-label="本局状态">
              <span>
                <small>时间</small>
                <strong>{stats.remainingSeconds}</strong>
              </span>
              <span>
                <small>得分</small>
                <strong>{stats.score}</strong>
              </span>
              <span className={stats.combo >= 2 ? "is-hot" : ""}>
                <small>连击</small>
                <strong>×{Math.min(stats.combo, 10)}</strong>
              </span>
              <button onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
                {paused ? "继续" : "暂停"}
              </button>
            </div>
            <DropGameCanvas
              sessionId={sessionId}
              characterType={result?.typeId ?? "chosen"}
              paused={paused}
              onStatsChange={setStats}
              onFinish={finish}
            />
            {paused ? (
              <div className="game-pause" role="dialog" aria-modal="true" aria-label="游戏已暂停">
                <strong>先喘口气</strong>
                <p>倒计时和掉落都停住了。</p>
                <Button onClick={() => setPaused(false)}>继续接住</Button>
                <Link to="/home">结束并回草坪</Link>
              </div>
            ) : null}
          </>
        ) : phase === "countdown" ? (
          <div className="game-countdown" aria-live="assertive">
            <span>{countdown || "GO"}</span>
            <p>拖动屏幕，或使用 ← → / A D</p>
          </div>
        ) : (
          <div className="game-intro">
            <span className="game-intro__mark" aria-hidden="true">
              补给雨
            </span>
            {summary ? (
              <div className="game-summary">
                <p className="eyebrow">本局得分</p>
                <strong>{summary.score}</strong>
                <p>最高 {summary.maxCombo} 连击 · 接住后已一次性放入背包</p>
                <div className="loot-row" aria-label="本局获得物品">
                  {Object.entries(summary.caught).length ? (
                    Object.entries(summary.caught).map(([id, count]) => (
                      <span key={id}>
                        {ITEM_CATALOG[id as ItemId].name} × {count}
                      </span>
                    ))
                  ) : (
                    <p>这次没有接住也没关系，不扣分，也不会影响飞马。</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h2>30 秒，把补给带回草坪</h2>
                <p>连续接住会提高倍率，漏接只会清空连击。速度会慢慢加快，随时可以暂停。</p>
              </>
            )}
            <Button onClick={start}>{summary ? "再接一局" : "准备开始"}</Button>
            {summary ? (
              <Link className="quiet-link" to="/home">
                带着补给回草坪
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
