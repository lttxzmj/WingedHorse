import { ITEM_CATALOG, ITEM_IDS } from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";

export function InventoryPage() {
  const inventory = useAppStore((state) => state.inventory);
  const vitals = useAppStore((state) => state.petVitals);
  const useItem = useAppStore((state) => state.useItem);
  const [notice, setNotice] = useState("");
  const owned = ITEM_IDS.filter((id) => (inventory[id] ?? 0) > 0);
  return (
    <main className="inventory-page">
      <header className="subpage-header">
        <Link to="/home">←</Link>
        <div>
          <p className="eyebrow">飞马背包</p>
          <h1>今天接住的东西</h1>
        </div>
        <span>{owned.reduce((sum, id) => sum + (inventory[id] ?? 0), 0)} 件</span>
      </header>
      <section className="vitals-card" aria-label="飞马状态">
        {[
          { key: "energy", label: "力气", value: vitals.energy },
          { key: "warmth", label: "暖意", value: vitals.warmth },
          { key: "joy", label: "开心", value: vitals.joy }
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
                <span className="item-card__emoji">{item.emoji}</span>
                <div>
                  <h2>
                    {item.name} <small>× {inventory[id]}</small>
                  </h2>
                  <p>{item.description}</p>
                </div>
                <Button
                  variant="secondary"
                  disabled={!item.consumable}
                  onClick={() => {
                    const okay = useItem(id);
                    setNotice(okay ? `飞马收下了${item.name}。` : "现在还不能使用它。");
                  }}
                >
                  {item.consumable ? "送给飞马" : "制作素材"}
                </Button>
              </Card>
            );
          })
        ) : (
          <section className="empty-state inventory-empty">
            <span className="empty-state__icon">🧺</span>
            <h2>背包还是空的</h2>
            <p>去接一局掉落，第一份礼物也许正在路上。</p>
            <Link className="ui-button ui-button--primary inline-link-button" to="/game">
              去接礼物
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}
