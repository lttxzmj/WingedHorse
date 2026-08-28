import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { DIMENSIONS, dimensionLabels, getResultProfile } from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { useNavigate } from "@tanstack/react-router";
import { SunMedium } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { AppIcon } from "../components/AppIcon";
import { createResultShareCard } from "../lib/resultShareCard";
import { useAppStore } from "../store/useAppStore";

const dimensionCopy = {
  energy: { low: "需要充电", high: "电量在线", meaning: "你此刻可调用的精力和恢复余量" },
  engine: { low: "容易被推着走", high: "更能主动启动", meaning: "你开始并推进事情的主动程度" },
  chaos: { low: "情绪较稳定", high: "更需要释放", meaning: "压力积累后想吐槽、爆发或排解的程度" },
  direction: { low: "还在找方向", high: "方向较清楚", meaning: "你对下一步想去哪里的清晰程度" }
} as const;

export function ResultPage() {
  const navigate = useNavigate();
  const result = useAppStore((state) => state.result);
  const reset = useAppStore((state) => state.resetAssessment);
  const [shareMessage, setShareMessage] = useState("");

  const [isSharing, setIsSharing] = useState(false);
  const isSharingRef = useRef(false);

  if (!result) {
    return (
      <main className="centered-page">
        <section className="empty-state">
          <h1>还没有测评结果</h1>
          <p>先走完这一天，再来看看你的飞马形态。</p>
          <Button onClick={() => void navigate({ to: "/assessment" })}>开始测评</Button>
        </section>
      </main>
    );
  }

  const currentResult = result;
  const profile = getResultProfile(result.typeId);
  async function shareResultCard() {
    if (isSharingRef.current) return;
    isSharingRef.current = true;
    setIsSharing(true);
    setShareMessage("正在生成分享卡…");
    try {
      const blob = await createResultShareCard(currentResult, profile);
      const file = new File([blob], `我的飞升报告-${profile.name}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `我的飞升报告：${profile.name}`,
          text: `我测出了${profile.name}。${profile.tagline}`,
          files: [file]
        });
        setShareMessage("飞升海报已准备好。");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
        setShareMessage("飞升海报已保存，可以发给朋友了。");
      }
    } catch {
      setShareMessage("暂时没能生成飞升海报，请稍后再试。");
    } finally {
      isSharingRef.current = false;
      setIsSharing(false);
    }
  }

  return (
    <main className="result-page">
      <section
        className="result-hero"
        style={{ "--result-accent": profile.accent } as CSSProperties}
      >
        <WingedHorseCharacter
          mood={profile.mood}
          typeId={result.typeId}
          alt={"代表" + profile.name + "的原创牛马角色"}
        />
        <div className="result-hero__copy">
          <p className="eyebrow">测评完成 · 17/17</p>
          <h1>{profile.name}</h1>
          <p className="result-rarity">{profile.rarity}</p>
          <p className="result-tagline">{profile.tagline}</p>
        </div>
      </section>

      <div className="result-grid">
        <Card className="result-card" id="result-scores">
          <h2>此刻的状态</h2>
          <div className="score-list">
            {DIMENSIONS.map((dimension) => {
              const score = Math.round(result.normalizedScores[dimension]);
              return (
                <div className="score-row" key={dimension}>
                  <div>
                    <span>{dimensionLabels[dimension]}</span>
                    <strong>{score}</strong>
                  </div>
                  <div
                    className="score-track"
                    role="meter"
                    aria-label={dimensionLabels[dimension]}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={score}
                  >
                    <span style={{ width: String(score) + "%" }} />
                  </div>
                  <div className="score-poles" aria-hidden="true">
                    <span>{dimensionCopy[dimension].low}</span>
                    <span>{dimensionCopy[dimension].high}</span>
                  </div>
                  <p className="score-meaning">{dimensionCopy[dimension].meaning}</p>
                </div>
              );
            })}
          </div>
          {result.edgeDimensions.length > 0 ? (
            <p className="edge-note">
              你有一些藏在边界上的特质：
              {result.edgeDimensions.map((dimension) => dimensionLabels[dimension]).join("、")}
              还会随情境轻轻摇摆。
            </p>
          ) : null}
        </Card>

        <Card className="result-card bloodline-card">
          <h2>类型构成</h2>
          <div className="bloodline-card__primary">
            <span>{profile.name}</span>
            <strong>{result.bloodline.purity}%</strong>
          </div>
          <div className="score-track" aria-hidden="true">
            <span style={{ width: `${result.bloodline.purity}%` }} />
          </div>
          {result.bloodline.hidden.length > 0 ? (
            <ul className="bloodline-card__hidden">
              {result.bloodline.hidden.map((item) => (
                <li key={item.typeId}>
                  <span>隐藏着一点 {getResultProfile(item.typeId).name}</span>
                  <strong>{item.percentage}%</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="edge-note">这一型很纯，暂时没有明显的隐藏血统。</p>
          )}
          <p className="direction-note">
            {result.directionHint === "clear-direction"
              ? "你的导航仪还算清楚：先照顾好续航，再沿着想走的方向慢慢加速。"
              : "你的导航仪正在找信号：不用现在决定远方，先找一件愿意往前挪一点的小事。"}
          </p>
        </Card>

        <Card className="result-card" id="result-profile">
          <h2>你可能会这样</h2>
          <ul className="observation-list">
            {profile.observations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="advice-box">
            <span aria-hidden="true">
              <AppIcon icon={SunMedium} size={22} />
            </span>
            <div>
              <strong>给今天的你</strong>
              <p>{profile.advice}</p>
            </div>
          </div>
        </Card>
      </div>

      {result.easterEggs.map((egg) => (
        <p className="easter-egg" key={egg}>
          {egg}
        </p>
      ))}
      <section className="evolution-callout" aria-labelledby="evolution-title">
        <div className="evolution-callout__copy">
          <strong id="evolution-title">飞升路线</strong>
          <p>{profile.evolution}</p>
        </div>
        <div className="evolution-path" aria-label="从此刻的牛马通往未知的天马">
          <span>此刻</span>
          <i aria-hidden="true" />
          <span className="evolution-path__mystery" aria-hidden="true">
            {profile.id === "chosen" ? "🪽" : "?"}
          </span>
          <span>{profile.id === "chosen" ? "天马已现" : "天马 · 未解锁"}</span>
        </div>
      </section>
      <div className="result-actions">
        <button
          type="button"
          className="result-moyu-cta"
          onClick={() => void navigate({ to: "/game", hash: "start" })}
          aria-label="开始摸鱼：去接补给"
        >
          <span className="result-moyu-cta__swirl" aria-hidden="true" />
          <span className="result-moyu-cta__ripple" aria-hidden="true" />
          <span className="result-moyu-cta__ripple result-moyu-cta__ripple--late" aria-hidden="true" />
          <span className="result-moyu-cta__glow" aria-hidden="true" />
          <span className="result-moyu-cta__label">开始摸鱼</span>
        </button>
        <Button
          variant="secondary"
          disabled={isSharing}
          onClick={() => void shareResultCard()}
        >
          {isSharing ? "正在生成海报…" : "生成我的飞升海报"}
        </Button>
        <Button
          variant="tertiary"
          onClick={() => {
            reset();
            void navigate({ to: "/assessment" });
          }}
        >
          重新测一次
        </Button>
      </div>
      <p className="share-message" aria-live="polite">
        {shareMessage}
      </p>
      <p className="result-disclaimer">
        本结果为娱乐测评，不构成心理、医疗或职业建议。类型只会在你主动复测时改变。
      </p>
    </main>
  );
}
