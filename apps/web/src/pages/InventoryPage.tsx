import { ITEM_CATALOG, ITEM_IDS, type ItemEffect } from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { PackageOpen } from "lucide-react";
import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { useAppStore } from "../store/useAppStore";

const EFFECT_LABELS = {
  energy: "电量",
  engine: "发动机",
  chaos: "疯感",
  direction: "导航仪"
} as const;

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
  const useItem = useAppStore((state) => state.useItem);
  const [notice, setNotice] = useState("");
  const [pendingItem, setPendingItem] = useState<(typeof ITEM_IDS)[number] | null>(null);
  const owned = ITEM_IDS.filter((id) => (inventory[id] ?? 0) > 0);
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
      <section className="vitals-card" aria-label="飞马状态">
        {[
          { key: "energy", label: "电量", value: vitals.energy },
          { key: "engine", label: "发动机", value: vitals.engine },
          { key: "chaos", label: "疯感", value: vitals.chaos },
          { key: "direction", label: "导航仪", value: vitals.direction }
        ].map((meter) => (
          <div key={meter.key}>
            <span>{meter.label}</span>
            <div className="mini-meter">
              <i style={{ width: `${meter.value}%` }} />
            </div>
            <b>{meter.value}</b>
          </div>
        ))}
      </section>
      {notice ? (
        <p className="toast-notice" role="status">
          {notice}
        </p>
      ) : null}
      <section className="inventory-grid">
        {owned.length ? (
          owned.map((id) => {
            const item = ITEM_CATALOG[id];
            return (
              <Card className="item-card" key={id}>
                <span className="item-card__emoji" aria-hidden="true">
                  {item.icon}
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
                    const okay = useItem(id);
                    setNotice(
                      okay
                        ? `飞马收下了${item.name}，${describeEffect(item.effect)}，同行值 +2。`
                        : "现在还不能使用它。"
                    );
                  }}
                >
                  {item.consumable ? "给牛马使用" : "已经收藏"}
                </Button>
              </Card>
            );
          })
        ) : (
          <section className="empty-state inventory-empty">
            <span className="empty-state__icon"><AppIcon icon={PackageOpen} size={42} /></span>
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
                  const okay = useItem(pendingItem);
                  setNotice(
                    okay
                      ? `飞马收下了${item.name}，${describeEffect(item.effect)}，同行值 +2。`
                      : "现在还不能使用它。"
                  );
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
