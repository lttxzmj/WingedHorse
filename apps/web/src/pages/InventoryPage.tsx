import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import {
  ITEM_CATALOG,
  ITEM_IDS,
  deriveCompanionGrowth,
  getResultProfile,
  type ItemEffect,
  type ItemId
} from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { Heart, PackageOpen, Sparkles } from "lucide-react";
import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { ItemIcon } from "../components/ItemIcon";
import { useAppStore } from "../store/useAppStore";
import "../cultivation.css";

const EFFECT_LABELS = {
  energy: "喘息余量",
  engine: "行动手感",
  chaos: "心里噪音",
  direction: "方向感"
} as const;

type InventoryFilter = "all" | "care" | "release" | "direction" | "keepsake";

const FILTERS: Array<{ id: InventoryFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "care", label: "照顾" },
  { id: "release", label: "放松" },
  { id: "direction", label: "方向" },
  { id: "keepsake", label: "收藏" }
];

function itemMatchesFilter(itemId: ItemId, filter: InventoryFilter) {
  const item = ITEM_CATALOG[itemId];
  if (filter === "all") return true;
  if (filter === "care") return item.kind === "energy-supply" || item.kind === "engine-tool";
  if (filter === "release") return item.kind === "pressure-release";
  if (filter === "direction") return item.kind === "navigation";
  return !item.consumable || item.kind === "decoration" || item.kind === "sponsored-supply";
}

function vitalState(key: keyof typeof EFFECT_LABELS, value: number) {
  if (key === "chaos") {
    if (value >= 70) return "有点吵";
    if (value >= 40) return "还能放下";
    return "很松弛";
  }
  if (value >= 70) return "很充足";
  if (value >= 40) return "刚刚好";
  return "想被照顾";
}

function describeEffect(effect: ItemEffect) {
  const parts = Object.entries(effect).map(([key, value]) => {
    const label = EFFECT_LABELS[key as keyof typeof EFFECT_LABELS];
    return `${label} ${value && value > 0 ? "+" : ""}${value}`;
  });
  return parts.length ? parts.join(" · ") : "收藏物品，不改变状态";
}

export function InventoryPage() {
  const inventory = useAppStore((state) => state.inventory);
  const vitals = useAppStore((state) => state.petVitals);
  const result = useAppStore((state) => state.result);
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const useItem = useAppStore((state) => state.useItem);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [pendingItem, setPendingItem] = useState<(typeof ITEM_IDS)[number] | null>(null);
  const owned = ITEM_IDS.filter((id) => (inventory[id] ?? 0) > 0);
  const visibleItems = owned.filter((id) => itemMatchesFilter(id, filter));
  const recommendedItem = owned.find(
    (id) => ITEM_CATALOG[id].consumable && ITEM_CATALOG[id].rarity !== "rare"
  );
  const growth = deriveCompanionGrowth(relationshipXp);
  const profile = result ? getResultProfile(result.typeId) : null;

  function useAndRespond(id: ItemId) {
    const item = ITEM_CATALOG[id];
    const okay = useItem(id);
    setNotice(
      okay
        ? `飞马收下了${item.name}。${describeEffect(item.effect)}，你们又多了一段共同记录。`
        : "现在还不能使用它。"
    );
    return okay;
  }

  return (
    <main className="inventory-page">
      <header className="subpage-header">
        <BackLink to="/home" label="回到草原" />
        <div>
          <p className="eyebrow">飞马背包</p>
          <h1>今天接住的东西</h1>
        </div>
        <span>{owned.reduce((sum, id) => sum + (inventory[id] ?? 0), 0)} 件</span>
      </header>
      <section className="inventory-companion-card" aria-labelledby="inventory-companion-title">
        {result && profile ? (
          <WingedHorseCharacter typeId={result.typeId} mood={profile.mood} alt={profile.name} />
        ) : null}
        <div>
          <p className="eyebrow">{growth.relationshipLabel} · {growth.name}阶段</p>
          <h2 id="inventory-companion-title">先看看它今天需要什么</h2>
          <p>{growth.description}</p>
        </div>
      </section>
      <section className="vitals-card vitals-card--human" aria-label="飞马今天的状态">
        {[
          { key: "energy", label: "喘息余量", value: vitals.energy },
          { key: "engine", label: "行动手感", value: vitals.engine },
          { key: "chaos", label: "心里噪音", value: vitals.chaos },
          { key: "direction", label: "方向感", value: vitals.direction }
        ].map((meter) => (
          <div key={meter.key}>
            <span>
              {meter.label}
              <small>{vitalState(meter.key as keyof typeof EFFECT_LABELS, meter.value)}</small>
            </span>
            <div className="mini-meter">
              <i
                className={meter.key === "chaos" ? "is-inverse" : ""}
                style={{ width: `${meter.value}%` }}
              />
            </div>
            <b>{meter.value}</b>
          </div>
        ))}
      </section>
      {recommendedItem ? (
        <section className="inventory-recommendation" aria-labelledby="recommendation-title">
          <span className="inventory-recommendation__icon" aria-hidden="true">
            <AppIcon icon={Heart} size={22} />
          </span>
          <div>
            <p className="eyebrow">现在可以做的小事</p>
            <h2 id="recommendation-title">把{ITEM_CATALOG[recommendedItem].name}给它</h2>
            <p>{ITEM_CATALOG[recommendedItem].description}</p>
          </div>
          <Button variant="secondary" onClick={() => useAndRespond(recommendedItem)}>
            给它使用
          </Button>
        </section>
      ) : null}
      {notice ? (
        <div className="care-response" role="status">
          <AppIcon icon={Sparkles} size={19} />
          <p>{notice}</p>
          <Link to="/home">回草原看看它</Link>
        </div>
      ) : null}
      {owned.length ? (
        <div className="inventory-filters" aria-label="筛选背包物品">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              className={filter === option.id ? "is-active" : ""}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      <section className="inventory-grid">
        {owned.length ? (
          visibleItems.length ? visibleItems.map((id) => {
            const item = ITEM_CATALOG[id];
            return (
              <Card className="item-card" key={id}>
                <span className="item-card__emoji" aria-hidden="true">
                  <ItemIcon itemId={id} size={28} />
                </span>
                <div>
                  <h2>
                    {item.name} <small>× {inventory[id]}</small>
                  </h2>
                  <p>{item.description}</p>
                  <p className="item-card__effect">使用后：{describeEffect(item.effect)}</p>
                  {item.sponsored ? (
                    <small className="sponsor-label">品牌赞助/活动道具</small>
                  ) : null}
                </div>
                <Button
                  variant="secondary"
                  disabled={!item.consumable}
                  onClick={() => {
                    if (item.rarity === "rare") {
                      setPendingItem(id);
                      return;
                    }
                    useAndRespond(id);
                  }}
                >
                  {item.consumable ? "给牛马使用" : "已经收藏"}
                </Button>
              </Card>
            );
          }) : (
            <section className="inventory-filter-empty">
              <p>这一类还没有物品。</p>
              <button onClick={() => setFilter("all")}>查看全部</button>
            </section>
          )
        ) : (
          <section className="empty-state inventory-empty">
            <span className="empty-state__icon">
              <AppIcon icon={PackageOpen} size={42} />
            </span>
            <h2>背包还是空的</h2>
            <p>去接一局掉落，第一份礼物也许正在路上。</p>
            <Link className="ui-button ui-button--primary inline-link-button" to="/game">
              去接礼物
            </Link>
          </section>
        )}
      </section>
      {pendingItem ? (
        <section
          className="inventory-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="use-item-title"
        >
          <div>
            <p className="eyebrow">稀有物品</p>
            <h2 id="use-item-title">要使用{ITEM_CATALOG[pendingItem].name}吗？</h2>
            <p>
              使用后：{describeEffect(ITEM_CATALOG[pendingItem].effect)}。这件物品会从背包中减少 1
              件。
            </p>
            <div>
              <Button
                onClick={() => {
                  const item = ITEM_CATALOG[pendingItem];
                  useAndRespond(item.id);
                  setPendingItem(null);
                }}
              >
                确认使用
              </Button>
              <Button variant="secondary" onClick={() => setPendingItem(null)}>
                先留着
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
