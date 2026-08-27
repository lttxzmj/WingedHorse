import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { DIMENSIONS, dimensionLabels, getResultProfile } from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { useAppStore } from "../store/useAppStore";

export function ResultPage() {
  const navigate = useNavigate();
  const result = useAppStore((state) => state.result);
  const reset = useAppStore((state) => state.resetAssessment);
  const feedback = useAppStore((state) => state.resultFeedback);
  const setFeedback = useAppStore((state) => state.setResultFeedback);
  const [shareMessage, setShareMessage] = useState("");

  if (!result) {
    return (
      <main className="centered-page">
        <section className="empty-state">
          <span className="empty-state__icon" aria-hidden="true">🪽</span>
          <h1>还没有测评结果</h1>
          <p>先走完这一天，再来看看你的飞马形态。</p>
          <Button onClick={() => void navigate({ to: "/assessment" })}>开始测评</Button>
        </section>
      </main>
    );
  }

  const profile = getResultProfile(result.typeId);
  async function shareResult() {
    const text = "我的牛马类型是“" + profile.name + "”：" + profile.tagline + " #WingedHorse";
    try {
      if (navigator.share) await navigator.share({ title: "我的 WingedHorse 测评", text });
      else {
        await navigator.clipboard.writeText(text);
        setShareMessage("结果文案已复制，可以发给朋友了。");
      }
    } catch {
      setShareMessage("分享已取消，结果还安全地留在这里。");
    }
  }

  return (
    <main className="result-page">
      <section className="result-hero" style={{ "--result-accent": profile.accent } as CSSProperties}>
        <div className="result-hero__copy">
          <p className="eyebrow">你的当前形态</p>
          <h1>{profile.name}</h1>
          <p className="result-tagline">{profile.tagline}</p>
        </div>
        <WingedHorseCharacter mood={profile.mood} aria-label={"代表" + profile.name + "的原创小飞马"} />
      </section>

      <div className="result-grid">
        <Card className="result-card">
          <h2>你的四维状态</h2>
          <div className="score-list">
            {DIMENSIONS.map((dimension) => {
              const score = Math.round(result.normalizedScores[dimension]);
              return (
                <div className="score-row" key={dimension}>
                  <div><span>{dimensionLabels[dimension]}</span><strong>{score}</strong></div>
                  <div className="score-track" role="meter" aria-label={dimensionLabels[dimension]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
                    <span style={{ width: String(score) + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {result.edgeDimensions.length > 0 ? (
            <p className="edge-note">你有一些藏在边界上的特质：{result.edgeDimensions.map((dimension) => dimensionLabels[dimension]).join("、")}还会随情境轻轻摇摆。</p>
          ) : null}
        </Card>

        <Card className="result-card">
          <h2>有点像你的地方</h2>
          <ul className="observation-list">{profile.observations.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="advice-box"><span aria-hidden="true">☀</span><div><strong>今天的小药方</strong><p>{profile.advice}</p></div></div>
        </Card>
      </div>

      {result.easterEggs.map((egg) => <p className="easter-egg" key={egg}>{egg}</p>)}
      <section className="evolution-callout">
        <span className="evolution-callout__wing" aria-hidden="true">🪽</span>
        <div><strong>进化图鉴已打开</strong><p>{profile.evolution}</p></div>
      </section>
      <section className="result-feedback" aria-label="结果反馈"><div><strong>这次像你吗？</strong><p>只记录在当前浏览器，帮助你自己回看。</p></div>{feedback ? <span role="status">收到：{feedback === "accurate" ? "挺像我的" : "不太像我"}</span> : <div><button onClick={() => setFeedback("accurate")}>挺像我的</button><button onClick={() => setFeedback("inaccurate")}>不太像我</button></div>}</section>
      <div className="result-actions">
        <Button onClick={() => void navigate({ to: "/home" })}>去草坪见见它</Button>
        <Button variant="secondary" onClick={() => void shareResult()}>分享这个结果</Button>
        <Button variant="tertiary" onClick={() => { reset(); void navigate({ to: "/assessment" }); }}>重新测一次</Button>
      </div>
      <p className="share-message" aria-live="polite">{shareMessage}</p>
      <p className="result-disclaimer">本结果为娱乐测评，不构成心理、医疗或职业建议。类型只会在你主动复测时改变。</p>
    </main>
  );
}
