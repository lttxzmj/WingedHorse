import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { Button, Card } from "@wingedhorse/ui";
import { useNavigate } from "@tanstack/react-router";
import { useAppStore } from "../store/useAppStore";

export function LandingPage() {
  const navigate = useNavigate();
  const answered = useAppStore((state) => Object.keys(state.answers).length);
  return (
    <main className="app-shell">
      <section className="welcome" aria-labelledby="welcome-title">
        <div className="welcome__copy">
          <p className="eyebrow">WINGEDHORSE · 牛马飞升</p>
          <h1 id="welcome-title">先看看今天的自己，再慢慢长出翅膀。</h1>
          <p className="welcome__description">一个轻松的娱乐问卷，和一只不会催你上进的飞马伙伴。</p>
          <Button onClick={() => void navigate({ to: "/assessment" })}>
            {answered > 0 ? "继续上次测评" : "开始 90 秒测评"}
          </Button>
          <p className="disclaimer">娱乐测评，不构成心理、医疗或职业建议。</p>
        </div>
        <Card className="character-stage">
          <p className="character-stage__bubble">今天也可以先喘口气。</p>
          <WingedHorseCharacter mood="happy" aria-label="一只开心挥动翅膀的原创小飞马" />
        </Card>
      </section>
    </main>
  );
}
