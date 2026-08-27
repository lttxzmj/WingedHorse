import { ITEM_CATALOG, type ItemId } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { DropGameCanvas, type GameSummary } from "../game/DropGameCanvas";
import { useAppStore } from "../store/useAppStore";

export function GamePage() {
  const [playing, setPlaying] = useState(false);
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const collectItem = useAppStore((state) => state.collectItem);
  const recordGame = useAppStore((state) => state.recordGame);

  const finish = (nextSummary: GameSummary) => {
    Object.entries(nextSummary.caught).forEach(([id, quantity]) => {
      if (quantity) collectItem(id as ItemId, quantity);
    });
    recordGame();
    setSummary(nextSummary);
    setPlaying(false);
  };

  return (
    <main className="game-page">
      <header className="subpage-header">
        <Link to="/home" aria-label="回到草坪">
          ←
        </Link>
        <div>
          <p className="eyebrow">宇宙 Online · 今日掉落</p>
          <h1>接住小礼物</h1>
        </div>
        <Link to="/inventory">背包</Link>
      </header>
      <section className="game-shell">
        {playing ? (
          <DropGameCanvas onFinish={finish} />
        ) : (
          <div className="game-intro">
            <span className="game-intro__sky" aria-hidden="true">
              ☁️ ✨ ☁️
            </span>
            {summary ? (
              <div className="game-summary">
                <p className="eyebrow">本局得分</p>
                <strong>{summary.score}</strong>
                <div className="loot-row">
                  {Object.entries(summary.caught).length ? (
                    Object.entries(summary.caught).map(([id, count]) => (
                      <span key={id}>
                        {ITEM_CATALOG[id as ItemId].emoji} × {count}
                      </span>
                    ))
                  ) : (
                    <p>这次没有接住也没关系，礼物不会生气。</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h2>30 秒，左右移动篮子</h2>
                <p>鼠标、手指都可以。接住的物品会进入背包，有些可以送给飞马。</p>
              </>
            )}
            <Button
              onClick={() => {
                setSummary(null);
                setPlaying(true);
              }}
            >
              {summary ? "再玩一次" : "开始接住"}
            </Button>
            <Link className="quiet-link" to="/home">
              今天先不玩
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
