import { Button } from "@wingedhorse/ui";
import { useNavigate } from "@tanstack/react-router";
import { CHARACTER_NAME, PRODUCT_NAME, PRODUCT_SLOGAN } from "@wingedhorse/domain";
import { CircleHelp, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { AppIcon } from "../components/AppIcon";
import { trackEvent } from "../lib/analytics";
import { useAppStore } from "../store/useAppStore";

export function LandingPage() {
  const navigate = useNavigate();
  const answered = useAppStore((state) => Object.keys(state.answers).length);
  useEffect(() => {
    trackEvent("landing_view");
  }, []);
  return (
    <main className="quiz-landing">
      <section className="quiz-landing__content" aria-labelledby="welcome-title">
        <p className="quiz-landing__teaser">
          <AppIcon icon={Sparkles} size={16} />
          {PRODUCT_SLOGAN}
          <AppIcon icon={Sparkles} size={16} />
        </p>
        <div className="quiz-landing__mystery" aria-hidden="true">
          <AppIcon icon={CircleHelp} size={58} />
        </div>
        <div className="quiz-landing__copy">
          <p className="eyebrow">{PRODUCT_NAME}</p>
          <h1 id="welcome-title">你是什么牛马</h1>
          <p className="quiz-landing__description">走完打工人的一天，看看此刻的你。</p>
          <p className="quiz-landing__tag">17 题 · 约 90 秒 · 仅供娱乐</p>
          <Button
            onClick={() => {
              trackEvent("assessment_start");
              void navigate({ to: "/assessment" });
            }}
          >
            {answered > 0 ? "继续测测" : "开始测测"}
          </Button>
          <p className="disclaimer">答案由你选择，结果只作轻松参考</p>
          <a className="quiet-link" href="/intent">
            想把来来带回家
          </a>
        </div>
      </section>
    </main>
  );
}
