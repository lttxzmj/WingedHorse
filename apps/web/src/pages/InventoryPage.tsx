import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import {
  CHARACTER_NAME,
  ITEM_CATALOG,
  ITEM_IDS,
  deriveCompanionGrowth,
  getResultProfile,
  inventoryCategoryForItem,
  recommendCareItem,
  type ItemEffect,
  type ItemId,
  type InventoryCategory
} from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { PackageOpen, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { ItemIcon } from "../components/ItemIcon";
import { WelfareSheet } from "../components/WelfareSheet";
import { trackEvent } from "../lib/analytics";
import { useAppStore } from "../store/useAppStore";
import "../cultivation.css";

const EFFECT_LABELS = {
  energy: "喘息余量",
  engine: "行动手感",
  chaos: "心里噪音",
  direction: "方向感"
} as const;

type InventoryFilter = "all" | InventoryCategory;

type ItemUseFeedback = {
  itemId: ItemId;
  remaining: number;
};

const FILTERS: Array<{ id: InventoryFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "recovery", label: "恢复" },
  { id: "action", label: "行动" },
  { id: "release", label: "解压" },
  { id: "wool", label: "牛毛" },
  { id: "keepsake", label: "纪念" }
];

function itemMatchesFilter(itemId: ItemId, filter: InventoryFilter) {
  if (filter === "all") return true;
  return inventoryCategoryForItem(itemId) === filter;
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

function describeEffect(effect: ItemEffect, itemId?: ItemId) {
  const parts = Object.entries(effect).map(([key, value]) => {
    const label = EFFECT_LABELS[key as keyof typeof EFFECT_LABELS];
    return `${label} ${value && value > 0 ? "+" : ""}${value}`;
  });
  if (parts.length) return parts.join(" · ");
  if (itemId && ITEM_CATALOG[itemId].sponsored) return "牛毛纪念物，不改变状态";
  return "纪念物品，不改变状态";
}

export function InventoryPage() {
  const inventory = useAppStore((state) => state.inventory);
  const vitals = useAppStore((state) => state.petVitals);
  const result = useAppStore((state) => state.result);
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const useItem = useAppStore((state) => state.useItem);
  const [notice, setNotice] = useState("");
  const [useFeedback, setUseFeedback] = useState<ItemUseFeedback | null>(null);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [selectedItem, setSelectedItem] = useState<ItemId | null>(null);
  const [welfareItem, setWelfareItem] = useState<ItemId | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const owned = ITEM_IDS.filter((id) => (inventory[id] ?? 0) > 0);
  const availableFilters = FILTERS.filter(
    (option) => option.id === "all" || owned.some((id) => itemMatchesFilter(id, option.id))
  );
  const visibleItems = owned.filter((id) => itemMatchesFilter(id, filter));
  const recommendedItem = recommendCareItem(inventory, vitals);
  const orderedVisibleItems =
    recommendedItem && visibleItems.includes(recommendedItem)
      ? [recommendedItem, ...visibleItems.filter((id) => id !== recommendedItem)]
      : visibleItems;
  const growth = deriveCompanionGrowth(relationshipXp);
  const profile = result ? getResultProfile(result.typeId) : null;

  useEffect(() => {
    if (!selectedItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedItem(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!notice && !useFeedback) return;
    const timer = window.setTimeout(() => {
      setNotice("");
      setUseFeedback(null);
    }, 5_200);
    return () => window.clearTimeout(timer);
  }, [notice, useFeedback]);

  function useAndRespond(id: ItemId) {
    const item = ITEM_CATALOG[id];
    const previousCount = inventory[id] ?? 0;
    const okay = useItem(id);
    setNotice(
      okay ? `它收下了${item.name}。${describeEffect(item.effect, id)}。` : "现在还不能使用它。"
    );
    if (okay) setUseFeedback({ itemId: id, remaining: Math.max(0, previousCount - 1) });
    return okay;
  }

  return (
    <main className="inventory-page">
      <header className="subpage-header">
        <BackLink to={result ? "/home" : "/"} label={result ? "回到草原" : "回到首页"} />
        <div>
          <p className="eyebrow">{CHARACTER_NAME}的背包</p>
          <h1>今天接住的东西</h1>
        </div>
        <span>{owned.reduce((sum, id) => sum + (inventory[id] ?? 0), 0)} 件</span>
      </header>
      <div className="inventory-overview">
        <section className="inventory-companion-card" aria-labelledby="inventory-companion-title">
          <div className="inventory-companion-card__visual">
            {result && profile ? (
              <WingedHorseCharacter typeId={result.typeId} mood={profile.mood} alt={profile.name} />
            ) : null}
          </div>
          <div className="inventory-companion-card__content">
            <div className="inventory-companion-card__meta">
              <span className="inventory-companion-card__tag">
                <i aria-hidden="true" />
                {growth.relationshipLabel}
              </span>
              <span className="inventory-companion-card__stage">{growth.name}阶段</span>
            </div>
            <h2 id="inventory-companion-title">
              {profile ? `${profile.name}正在整理补给` : "先看看它今天需要什么"}
            </h2>
            <p className="inventory-companion-card__desc">{growth.description}</p>
          </div>
        </section>
        <section className="vitals-card vitals-card--human" aria-label="来来今天的状态">
          {[
            { key: "energy", label: "喘息余量", value: vitals.energy },
            { key: "engine", label: "行动手感", value: vitals.engine },
            { key: "chaos", label: "心里噪音", value: vitals.chaos },
            { key: "direction", label: "方向感", value: vitals.direction }
          ].map((meter) => (
            <div className="vital-item" key={meter.key}>
              <div className="vital-item__header">
                <span className="vital-item__label">
                  {meter.label}
                  <small>{vitalState(meter.key as keyof typeof EFFECT_LABELS, meter.value)}</small>
                </span>
                <strong className="vital-item__value">{meter.value}</strong>
              </div>
              <div
                className="vital-item__track"
                role="meter"
                aria-label={meter.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={meter.value}
              >
                <span style={{ width: `${Math.min(Math.max(meter.value, 0), 100)}%` }} />
              </div>
            </div>
          ))}
        </section>
      </div>
      {notice && !useFeedback ? (
        <div className="inventory-use-toast" role="status" aria-live="polite">
          <AppIcon icon={Sparkles} size={19} />
          <p>{notice}</p>
        </div>
      ) : null}
      {useFeedback
        ? (() => {
            const usedItem = ITEM_CATALOG[useFeedback.itemId];
            return (
              <section
                className="inventory-use-feedback"
                aria-label="物品已使用"
                role="status"
                aria-live="polite"
              >
                <button
                  type="button"
                  className="inventory-use-feedback__close"
                  aria-label="关闭使用反馈"
                  onClick={() => {
                    setNotice("");
                    setUseFeedback(null);
                  }}
                >
                  <AppIcon icon={X} size={18} />
                </button>
                <span
                  className="inventory-use-feedback__icon"
                  data-kind={usedItem.kind}
                  aria-hidden="true"
                >
                  <ItemIcon itemId={useFeedback.itemId} size={36} />
                </span>
                <div className="inventory-use-feedback__copy">
                  <p className="eyebrow">它收下了</p>
                  <h2>{usedItem.name}</h2>
                  <p>背包还剩 {useFeedback.remaining} 件</p>
                </div>
                <div className="inventory-use-feedback__effects" aria-label="本次变化">
                  {Object.entries(usedItem.effect).map(([key, value]) => (
                    <span key={key}>
                      {EFFECT_LABELS[key as keyof typeof EFFECT_LABELS]}{" "}
                      {value && value > 0 ? "+" : ""}
                      {value}
                    </span>
                  ))}
                  <span>默契 +2</span>
                </div>
                <div className="inventory-use-feedback__actions">
                  <Link to="/home" onClick={() => setUseFeedback(null)}>
                    去草原看看它
                  </Link>
                  <button type="button" onClick={() => setUseFeedback(null)}>
                    继续整理
                  </button>
                </div>
              </section>
            );
          })()
        : null}
      <section className="inventory-workspace" aria-labelledby="inventory-items-title">
        <div className="inventory-toolbar">
          <div>
            <p className="eyebrow">我的物品</p>
            <h2 id="inventory-items-title">背包格子</h2>
          </div>
          <span>{owned.length} 种</span>
        </div>
        {owned.length ? (
          <div className="inventory-filters" aria-label="筛选背包物品">
            {availableFilters.map((option) => {
              const count =
                option.id === "all"
                  ? owned.length
                  : owned.filter((id) => itemMatchesFilter(id, option.id)).length;
              return (
                <button
                  key={option.id}
                  className={filter === option.id ? "is-active" : ""}
                  aria-pressed={filter === option.id}
                  aria-label={`${option.label}，${count} 种`}
                  onClick={() => {
                    setFilter(option.id);
                    setSelectedItem(null);
                  }}
                >
                  {option.label}
                  <small aria-hidden="true">{count}</small>
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="inventory-grid">
          {owned.length ? (
            orderedVisibleItems.length ? (
              orderedVisibleItems.map((id) => {
                const item = ITEM_CATALOG[id];
                const isSelected = selectedItem === id;
                return (
                  <button
                    type="button"
                    className={"inventory-slot" + (isSelected ? " is-selected" : "")}
                    key={id}
                    data-kind={item.kind}
                    aria-pressed={isSelected}
                    aria-label={`${item.name}，${inventory[id]} 件${recommendedItem === id ? "，推荐使用" : ""}`}
                    onClick={() => setSelectedItem(id)}
                  >
                    {recommendedItem === id ? (
                      <small className="inventory-slot__recommended">推荐</small>
                    ) : null}
                    <span className="inventory-slot__icon" aria-hidden="true">
                      <ItemIcon itemId={id} size={44} />
                    </span>
                    <strong>{item.name}</strong>
                    <span className="inventory-slot__count" aria-hidden="true">
                      <small>持有</small>
                      {inventory[id]}
                    </span>
                  </button>
                );
              })
            ) : (
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
        </div>
      </section>
      {selectedItem
        ? (() => {
            const item = ITEM_CATALOG[selectedItem];
            return (
              <section className="inventory-item-sheet" aria-label="物品操作">
                <button
                  type="button"
                  className="inventory-item-sheet__backdrop"
                  aria-label="关闭物品详情"
                  onClick={() => setSelectedItem(null)}
                />
                <div
                  className="inventory-item-sheet__panel"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="inventory-item-sheet-title"
                >
                  <span className="inventory-item-sheet__handle" aria-hidden="true" />
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="inventory-item-sheet__close"
                    aria-label="关闭物品详情"
                    onClick={() => setSelectedItem(null)}
                  >
                    <AppIcon icon={X} size={20} />
                  </button>
                  <div className="inventory-item-sheet__heading">
                    <span
                      className="inventory-item-sheet__icon"
                      data-kind={item.kind}
                      aria-hidden="true"
                    >
                      <ItemIcon itemId={selectedItem} size={54} />
                    </span>
                    <div>
                      <p className="eyebrow">
                        {item.sponsored
                          ? "品牌合作"
                          : recommendedItem === selectedItem
                            ? "现在最适合它"
                            : item.rarity === "rare"
                              ? "稀有物品"
                              : "背包物品"}
                      </p>
                      <h2 id="inventory-item-sheet-title">{item.name}</h2>
                      <span>持有 {inventory[selectedItem]} 件</span>
                    </div>
                  </div>
                  <p className="inventory-item-sheet__description">{item.description}</p>
                  <div className="inventory-item-sheet__effect">
                    <span>使用后</span>
                    <strong>{describeEffect(item.effect, selectedItem)}</strong>
                  </div>
                  {item.sponsored ? (
                    <small className="sponsor-label">品牌合作 · 与购买无关</small>
                  ) : null}
                  <div
                    className={`inventory-item-sheet__actions${
                      item.sponsored ? " inventory-item-sheet__actions--stack" : ""
                    }`}
                  >
                    {item.sponsored ? (
                      <Button
                        onClick={() => {
                          trackEvent("welfare_opened", { itemId: selectedItem });
                          setWelfareItem(selectedItem);
                          setSelectedItem(null);
                        }}
                      >
                        领牛毛
                      </Button>
                    ) : null}
                    <Button
                      variant={item.sponsored ? "secondary" : "primary"}
                      disabled={!item.consumable}
                      onClick={() => {
                        if (useAndRespond(selectedItem)) setSelectedItem(null);
                      }}
                    >
                      {item.consumable ? `给${CHARACTER_NAME}使用` : "纪念物，无需使用"}
                    </Button>
                    <Button variant="tertiary" onClick={() => setSelectedItem(null)}>
                      先留着
                    </Button>
                  </div>
                </div>
              </section>
            );
          })()
        : null}
      {welfareItem ? (
        <WelfareSheet itemId={welfareItem} onClose={() => setWelfareItem(null)} />
      ) : null}
    </main>
  );
}
