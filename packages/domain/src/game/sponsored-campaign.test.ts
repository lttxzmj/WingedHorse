import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./drop-table.js";
import { ITEM_CATALOG } from "./items.js";
import {
  DEFAULT_SPONSORED_CAMPAIGN,
  SPONSORED_CAMPAIGNS,
  getSponsoredCampaignByItemId,
  selectSponsoredCampaign,
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

  it("uses asset-printed marks only and configures welfare QR image", () => {
    expect(DEFAULT_SPONSORED_CAMPAIGN.partnerName).toBe("蓝盒子");
    expect(DEFAULT_SPONSORED_CAMPAIGN.partnerNameEn).toBe("BLUE BOX");
    expect(DEFAULT_SPONSORED_CAMPAIGN.productCode).toBe("N2");
    expect(DEFAULT_SPONSORED_CAMPAIGN.logoImage).toContain("logo.webp");
    expect(DEFAULT_SPONSORED_CAMPAIGN.productImage).toContain("pillow-n2.webp");
    expect(DEFAULT_SPONSORED_CAMPAIGN.welfare.hint).toBe("领牛毛");
    expect(DEFAULT_SPONSORED_CAMPAIGN.welfare.disclosure).toBe("");
    expect(DEFAULT_SPONSORED_CAMPAIGN.welfare.qrImage).toContain("welfare-qr.webp");
    expect(DEFAULT_SPONSORED_CAMPAIGN.welfare.demoQr).toBe(false);
    expect(sponsoredProductLabel()).toBe("蓝盒子 N2");
    expect(ITEM_CATALOG["sponsored-coffee-coupon"].name).toBe("蓝盒子 N2");
    expect(ITEM_CATALOG["sponsored-coffee-coupon"].description).toBe("BLUE BOX N2");
    expect(ITEM_CATALOG["sponsored-tent-skin"].name).toBe("蓝盒子");
    expect(ITEM_CATALOG["sponsored-tent-skin"].description).toBe("BLUE BOX");
  });

  it("includes LiberLive campaigns with logo-printed marks only", () => {
    expect(SPONSORED_CAMPAIGNS).toHaveLength(3);
    const aqua = getSponsoredCampaignByItemId("sponsored-liberlive-aqua");
    const sun = getSponsoredCampaignByItemId("sponsored-liberlive-sun");
    expect(aqua?.partnerName).toBe("LiberLive");
    expect(sun?.partnerName).toBe("LiberLive");
    expect(aqua?.productCode).toBe("");
    expect(sponsoredProductLabel(aqua)).toBe("LiberLive");
    expect(ITEM_CATALOG["sponsored-liberlive-aqua"].name).toBe("LiberLive");
    expect(ITEM_CATALOG["sponsored-liberlive-sun"].name).toBe("LiberLive");
    expect(aqua?.productImage).toContain("product-aqua.webp");
    expect(sun?.productImage).toContain("product-sun.webp");
  });

  it("selects one unreceived sponsored campaign and caps at one per round", () => {
    const first = selectSponsoredCampaign({
      gamesPlayed: 0,
      spawnedCount: 0,
      sponsoredSpawned: 0,
      receivedSponsoredItemIds: [],
      random: () => 0
    });
    expect(first?.boxItemId).toBe("sponsored-coffee-coupon");

    const none = selectSponsoredCampaign({
      gamesPlayed: 0,
      spawnedCount: 0,
      sponsoredSpawned: 1,
      receivedSponsoredItemIds: [],
      random: () => 0
    });
    expect(none).toBeNull();

    const next = selectSponsoredCampaign({
      gamesPlayed: 1,
      spawnedCount: 0,
      sponsoredSpawned: 0,
      receivedSponsoredItemIds: ["sponsored-coffee-coupon"],
      random: () => 0
    });
    expect(next?.boxItemId).toBe("sponsored-liberlive-aqua");

    const last = selectSponsoredCampaign({
      gamesPlayed: 2,
      spawnedCount: 0,
      sponsoredSpawned: 0,
      receivedSponsoredItemIds: ["sponsored-coffee-coupon", "sponsored-liberlive-aqua"],
      random: () => 0
    });
    expect(last?.boxItemId).toBe("sponsored-liberlive-sun");

    const done = selectSponsoredCampaign({
      gamesPlayed: 3,
      spawnedCount: 0,
      sponsoredSpawned: 0,
      receivedSponsoredItemIds: [
        "sponsored-coffee-coupon",
        "sponsored-liberlive-aqua",
        "sponsored-liberlive-sun"
      ],
      random: () => 0
    });
    expect(done).toBeNull();
  });
});
