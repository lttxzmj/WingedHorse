import { Button } from "@wingedhorse/ui";
import { useNavigate } from "@tanstack/react-router";
import { useAppStore } from "../store/useAppStore";

export function LandingPage() {
  const navigate = useNavigate();
  const answered = useAppStore((state) => Object.keys(state.answers).length);
  return (
    <main className="quiz-landing">
      <section className="quiz-landing__content" aria-labelledby="welcome-title">
        <p className="quiz-landing__teaser">
          <span aria-hidden="true">✦</span>
          传说有一头牛马，长出了翅膀
          <span aria-hidden="true">✦</span>
        </p>
        <div className="quiz-landing__mystery" aria-hidden="true">
          <span>?</span>
        </div>
        <div className="quiz-landing__copy">
          <h1 id="welcome-title">你是什么牛马</h1>
          <p className="quiz-landing__description">走完打工人的一天，看看此刻的你</p>
          <p className="quiz-landing__tag">17 题 · 约 90 秒 · 仅供娱乐</p>
          <Button onClick={() => void navigate({ to: "/assessment" })}>
            {answered > 0 ? "继续测测" : "开始测测"}
          </Button>
          <p className="disclaimer">答案由你选择，结果只作轻松参考</p>
        </div>
      </section>
    </main>
  );
}
