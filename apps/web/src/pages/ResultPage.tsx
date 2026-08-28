import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { DIMENSIONS, dimensionLabels, getResultProfile } from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
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
  const setIndex = useAppStore((state) => state.setAssessmentIndex);
  const feedback = useAppStore((state) => state.resultFeedback);
  const setFeedback = useAppStore((state) => state.setResultFeedback);
  const [shareMessage, setShareMessage] = useState("");

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
    setShareMessage("正在生成分享卡…");
    try {
      const blob = await createResultShareCard(currentResult, profile);
      const file = new File([blob], `我的牛马类型-${profile.name}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "我的 WingedHorse 测评", files: [file] });
        setShareMessage("分享卡已准备好。");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
        setShareMessage("分享卡已保存，可以发给朋友了。");
      }
    } catch {
      setShareMessage("暂时没能生成分享卡，请稍后再试。");
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
          aria-label={"代表" + profile.name + "的原创小飞马"}
        />
        <div className="result-hero__copy">
          <p className="eyebrow">你的当前形态</p>
          <h1>{profile.name}</h1>
          <p className="result-rarity">{profile.rarity}</p>
          <p className="result-tagline">{profile.tagline}</p>
        </div>
      </section>

      <nav className="result-jump-nav" aria-label="结果内容导航">
        <a href="#result-scores">四维状态</a>
        <a href="#result-profile">牛马白描</a>
        <a href="#result-method">结果说明</a>
      </nav>

      <div className="result-grid">
        <Card className="result-card" id="result-scores">
          <h2>你的四维状态</h2>
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
          <h2>你的牛马血统</h2>
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
          <h2>你的牛马白描</h2>
          <ul className="observation-list">
            {profile.observations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="advice-box">
            <span aria-hidden="true">☀</span>
            <div>
              <strong>牛马护理小贴士</strong>
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
      <section className="evolution-callout">
        <div>
          <strong>你的进化图鉴</strong>
          <p>{profile.evolution}</p>
        </div>
      </section>
      <Card className="result-card result-method" id="result-method">
        <h2>为什么是这个结果</h2>
        <p>
          前 16
          题会影响电量、发动机、疯感和导航仪；最后一题只触发彩蛋，不参与计分。前三个维度决定主类型，导航仪只影响方向建议。
        </p>
        <p>
          分数接近中间位置，代表你更容易随情境变化，所以会出现隐藏血统。血统是帮助理解结果的娱乐表达，不是人群概率或心理学诊断。
        </p>
        <button
          type="button"
          className="result-method__edit"
          onClick={() => {
            setIndex(16);
            void navigate({ to: "/assessment" });
          }}
        >
          修改最后一题
        </button>
      </Card>
      <section className="result-feedback" aria-label="结果反馈">
        <div>
          <strong>这次像你吗？</strong>
          <p>只记录在当前浏览器，帮助你自己回看。</p>
        </div>
        {feedback ? (
          <span role="status">收到：{feedback === "accurate" ? "是我本人" : "不太准"}</span>
        ) : (
          <div>
            <button onClick={() => setFeedback("accurate")}>是我本人</button>
            <button onClick={() => setFeedback("inaccurate")}>不太准</button>
          </div>
        )}
      </section>
      <div className="result-actions">
        <Button onClick={() => void navigate({ to: "/home" })}>开始进化</Button>
        <Button variant="secondary" onClick={() => void shareResultCard()}>
          保存或分享结果卡
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
