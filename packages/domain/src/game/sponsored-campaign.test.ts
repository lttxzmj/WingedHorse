import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./drop-table.js";
import { ITEM_CATALOG } from "./items.js";
import {
  DEFAULT_SPONSORED_CAMPAIGN,
  shouldSpawnSponsoredDrop,
  sponsoredDropDefinition,
  sponsoredProductLabel
} from "./sponsored-campaign.js";

describe("sponsored drop policy", () => {
  it("guarantees spawn until the player has received the item once", () => {
    expect(
      shouldSpawnSponsoredDrop({
        gamesPlayed: 0,
        spawnedCount: 0,
        sponsoredSpawned: 0,
        random: () => 0
      })
    ).toBe(true);
    expect(
      shouldSpawnSponsoredDrop({
        gamesPlayed: 1,
        spawnedCount: 0,
        sponsoredSpawned: 0,
        random: () => 0,
        hasReceivedSponsored: false
      })
    ).toBe(true);
    expect(
      shouldSpawnSponsoredDrop({
        gamesPlayed: 1,
        spawnedCount: 0,
        sponsoredSpawned: 0,
        random: () => 0,
        hasReceivedSponsored: true
      })
    ).toBe(false);
    expect(
      shouldSpawnSponsoredDrop({
        gamesPlayed: 0,
        spawnedCount: 1,
        sponsoredSpawned: 0,
        random: () => 0
      })
    ).toBe(false);
  });

  it("honours later-round chance and per-round cap when configured", () => {
    const campaign = {
      ...DEFAULT_SPONSORED_CAMPAIGN,
      drop: { ...DEFAULT_SPONSORED_CAMPAIGN.drop, laterRoundChance: 1, maxPerRound: 1 }
    };
    expect(
      shouldSpawnSponsoredDrop(
        {
          gamesPlayed: 4,
          spawnedCount: 0,
          sponsoredSpawned: 0,
          random: () => 0.2,
          hasReceivedSponsored: true
        },
        campaign
      )
    ).toBe(true);
    expect(
      shouldSpawnSponsoredDrop(
        {
          gamesPlayed: 4,
          spawnedCount: 0,
          sponsoredSpawned: 1,
          random: () => 0.2,
          hasReceivedSponsored: true
        },
        campaign
      )
    ).toBe(false);
  });

  it("only drops catalogued sponsored items", () => {
    const drop = sponsoredDropDefinition();
    expect(drop.itemId).toBe("sponsored-coffee-coupon");
    expect(drop.speed).toBeGreaterThan(0.8);
    expect(drop.speed).toBeLessThan(1.1);
    const random = createSeededRandom(1);
    expect(random()).toBeGreaterThanOrEqual(0);
  });

  it("uses asset-printed marks only and keeps the demo QR flag", () => {
    expect(DEFAULT_SPONSORED_CAMPAIGN.partnerName).toBe("蓝盒子");
    expect(DEFAULT_SPONSORED_CAMPAIGN.partnerNameEn).toBe("BLUE BOX");
    expect(DEFAULT_SPONSORED_CAMPAIGN.productCode).toBe("N2");
    expect(DEFAULT_SPONSORED_CAMPAIGN.logoImage).toContain("logo.webp");
    expect(DEFAULT_SPONSORED_CAMPAIGN.productImage).toContain("pillow-n2.webp");
    expect(DEFAULT_SPONSORED_CAMPAIGN.welfare.hint).toBe("领牛毛");
    expect(DEFAULT_SPONSORED_CAMPAIGN.welfare.disclosure).toBe("");
    expect(DEFAULT_SPONSORED_CAMPAIGN.welfare.demoQr).toBe(true);
    expect(sponsoredProductLabel()).toBe("蓝盒子 N2");
    expect(ITEM_CATALOG["sponsored-coffee-coupon"].name).toBe("蓝盒子 N2");
    expect(ITEM_CATALOG["sponsored-coffee-coupon"].description).toBe("BLUE BOX N2");
    expect(ITEM_CATALOG["sponsored-tent-skin"].name).toBe("蓝盒子");
    expect(ITEM_CATALOG["sponsored-tent-skin"].description).toBe("BLUE BOX");
  });
});

