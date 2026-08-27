import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { getResultProfile } from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAppStore } from "../store/useAppStore";

export function HomePage() {
  const navigate = useNavigate();
  const result = useAppStore((state) => state.result);
  const inventoryCount = useAppStore((state) =>
    Object.values(state.inventory).reduce((sum, count) => sum + (count ?? 0), 0)
  );
  if (!result) {
    return (
      <main className="centered-page">
        <section className="empty-state">
          <h1>先认识你的飞马</h1>
          <p>做完测评，它才知道该用什么方式接住你。</p>
          <Button onClick={() => void navigate({ to: "/assessment" })}>开始测评</Button>
        </section>
      </main>
    );
  }
  const profile = getResultProfile(result.typeId);
  return (
    <main className="home-page">
      <header className="home-header">
        <div>
          <p className="eyebrow">你的飞马草坪</p>
          <h1>晚上好，今天辛苦了。</h1>
        </div>
        <div className="home-header__tools">
          <Link className="icon-button" aria-label="打开背包" to="/inventory">
            🧺<small>{inventoryCount}</small>
          </Link>
          <Link className="icon-button" aria-label="打开设置" to="/settings">
            ⚙
          </Link>
        </div>
      </header>
      <section className="lawn-stage">
        <div className="lawn-stage__sun" aria-hidden="true" />
        <p className="lawn-stage__bubble">我不会催你。想玩一会儿，还是先休息？</p>
        <WingedHorseCharacter mood={profile.mood} aria-label={"草坪上的" + profile.name} />
        <div className="tent" aria-label="飞马休息的小帐篷">
          <span aria-hidden="true">⌂</span>
        </div>
      </section>
      <section className="home-actions" aria-label="今日活动">
        <Card className="action-card action-card--game">
          <span aria-hidden="true">🎁</span>
          <div>
            <strong>接住今天的掉落</strong>
            <p>30 秒，看看会掉下什么。</p>
          </div>
          <Button onClick={() => void navigate({ to: "/game" })}>开始</Button>
        </Card>
        <Card className="action-card">
          <span aria-hidden="true">🫧</span>
          <div>
            <strong>和我说两句</strong>
            <p>AI 伙伴会明确告诉你它是 AI。</p>
          </div>
          <Button variant="secondary" onClick={() => void navigate({ to: "/companion" })}>
            去聊天
          </Button>
        </Card>
        <Card className="action-card">
          <span aria-hidden="true">🌤️</span>
          <div>
            <strong>告诉我此刻状态</strong>
            <p>手动选择，或体验端侧镜头线索。</p>
          </div>
          <Button variant="secondary" onClick={() => void navigate({ to: "/signals" })}>
            看看状态
          </Button>
        </Card>
      </section>
    </main>
  );
}
