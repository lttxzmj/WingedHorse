import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { Button } from "@wingedhorse/ui";
import { useNavigate } from "@tanstack/react-router";
import { useAppStore } from "../store/useAppStore";

export function LandingPage() {
  const navigate = useNavigate();
  const answered = useAppStore((state) => Object.keys(state.answers).length);
  return (
    <main className="quiz-landing">
      <section className="quiz-landing__content" aria-labelledby="welcome-title">
        <p className="quiz-landing__teaser">传说有一只牛马，长出了翅膀</p>
        <div className="quiz-landing__character">
          <WingedHorseCharacter mood="happy" aria-label="一只准备长出翅膀的原创小牛马" />
        </div>
        <div className="quiz-landing__copy">
          <h1 id="welcome-title">你是什么牛马</h1>
          <p className="quiz-landing__description">
            16 幕打工日常 + 1 场坦白局
            <br />
            测测你是哪种牛马
          </p>
          <p className="quiz-landing__tag">约 90 秒 · 17 题 · 仅供娱乐</p>
          <Button onClick={() => void navigate({ to: "/assessment" })}>
            {answered > 0 ? "继续上次测评" : "开始 90 秒测评"}
          </Button>
          <p className="disclaimer">测评结果仅供娱乐，牛马终究会自由的</p>
        </div>
      </section>
    </main>
  );
}
