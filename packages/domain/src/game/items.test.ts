import { describe, expect, it } from "vitest";
import { ITEM_IDS, inventoryCategoryForItem } from "./items.js";

describe("inventory categories", () => {
  it("maps every catalogued item to one user-facing category", () => {
    for (const itemId of ITEM_IDS) {
      expect(inventoryCategoryForItem(itemId)).toBeTruthy();
    }
  });

  it("groups regular items by their use instead of implementation kind", () => {
    expect(inventoryCategoryForItem("iced-americano")).toBe("recovery");
    expect(inventoryCategoryForItem("main-quest-note")).toBe("action");
    expect(inventoryCategoryForItem("compass")).toBe("action");
    expect(inventoryCategoryForItem("screaming-chicken")).toBe("release");
  });

  it("keeps every sponsored item in the wool category", () => {
    expect(inventoryCategoryForItem("sponsored-tent-skin")).toBe("wool");
    expect(inventoryCategoryForItem("sponsored-coffee-coupon")).toBe("wool");
    expect(inventoryCategoryForItem("sponsored-liberlive-aqua")).toBe("wool");
    expect(inventoryCategoryForItem("sponsored-liberlive-sun")).toBe("wool");
  });
});
