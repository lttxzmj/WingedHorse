import { ITEM_CATALOG, type ItemId } from "./items.js";
import type { DropDefinition } from "./drop-table.js";

export interface SponsoredDropPolicy {
  enabled: boolean;
  firstRoundGuaranteed: boolean;
  laterRoundChance: number;
  maxPerRound: number;
  spawnIndex: number;
}

export interface SponsoredWelfare {
  name: string;
  hint: string;
  qrImage: string;
  /** Empty until brand-approved disclosure copy is provided. */
  disclosure: string;
  demoQr: boolean;
}

export interface SponsoredCampaign {
  id: string;
  partnerId: string;
  /** Partner mark as printed on brand assets (logo). */
  partnerName: string;
  /** Latin mark as printed on brand assets (logo / product). */
  partnerNameEn: string;
  /** Product code as printed on the product photo; empty when none is printed. */
  productCode: string;
  /** Logo path — drop / source recognition. */
  logoImage: string;
  /** Product photo path — welfare / inventory product view. */
  productImage: string;
  boxItemId: ItemId;
  drop: SponsoredDropPolicy;
  welfare: SponsoredWelfare;
}

const SHARED_WELFARE: SponsoredWelfare = {
  name: "牛毛",
  hint: "领牛毛",
  qrImage: "/brands/bluebox/welfare-qr.webp",
  disclosure: "",
  demoQr: false
};

const DEFAULT_DROP: SponsoredDropPolicy = {
  enabled: true,
  firstRoundGuaranteed: true,
  laterRoundChance: 0,
  maxPerRound: 1,
  spawnIndex: 0
};

/**
 * Copy and marks below are taken only from files in
 * `apps/web/public/brands/` (bluebox / liberlive).
 * Do not invent product names or marketing lines here.
 */
export const SPONSORED_CAMPAIGNS: readonly SponsoredCampaign[] = [
  {
    id: "bluebox-niumao-2026",
    partnerId: "bluebox",
    partnerName: "蓝盒子",
    partnerNameEn: "BLUE BOX",
    productCode: "N2",
    logoImage: "/brands/bluebox/logo.webp",
    productImage: "/brands/bluebox/pillow-n2.webp",
    boxItemId: "sponsored-coffee-coupon",
    drop: { ...DEFAULT_DROP },
    welfare: { ...SHARED_WELFARE }
  },
  {
    id: "liberlive-aqua-2026",
    partnerId: "liberlive",
    partnerName: "LiberLive",
    partnerNameEn: "LiberLive",
    productCode: "",
    logoImage: "/brands/liberlive/logo.webp",
    productImage: "/brands/liberlive/product-aqua.webp",
    boxItemId: "sponsored-liberlive-aqua",
    drop: { ...DEFAULT_DROP },
    welfare: { ...SHARED_WELFARE }
  },
  {
    id: "liberlive-sun-2026",
    partnerId: "liberlive",
    partnerName: "LiberLive",
    partnerNameEn: "LiberLive",
    productCode: "",
    logoImage: "/brands/liberlive/logo.webp",
    productImage: "/brands/liberlive/product-sun.webp",
    boxItemId: "sponsored-liberlive-sun",
    drop: { ...DEFAULT_DROP },
    welfare: { ...SHARED_WELFARE }
  }
];

/** Backward-compatible alias for the primary (Bluebox) campaign. */
export const DEFAULT_SPONSORED_CAMPAIGN: SponsoredCampaign = SPONSORED_CAMPAIGNS[0]!;

export function getSponsoredCampaignByItemId(itemId: ItemId): SponsoredCampaign | undefined {
  return SPONSORED_CAMPAIGNS.find((campaign) => campaign.boxItemId === itemId);
}

export function sponsoredProductLabel(
  campaign: SponsoredCampaign = DEFAULT_SPONSORED_CAMPAIGN
): string {
  const code = campaign.productCode.trim();
  return code ? `${campaign.partnerName} ${code}` : campaign.partnerName;
}

export function sponsoredDisplayName(
  campaign: SponsoredCampaign = DEFAULT_SPONSORED_CAMPAIGN
): string {
  return campaign.welfare.name;
}

export function sponsoredDropDefinition(
  campaign: SponsoredCampaign = DEFAULT_SPONSORED_CAMPAIGN
): DropDefinition {
  const item = ITEM_CATALOG[campaign.boxItemId];
  if (!item.sponsored) throw new Error("INVALID_SPONSORED_ITEM");
  return {
    itemId: campaign.boxItemId,
    weight: 0,
    points: item.rarity === "rare" ? 36 : 28,
    // Base fall speed; canvas applies slow-then-fast curve for sponsored feel.
    speed: 0.92
  };
}

export function shouldSpawnSponsoredDrop(
  input: {
    gamesPlayed: number;
    spawnedCount: number;
    sponsoredSpawned: number;
    random: () => number;
    /** True after the player has settled at least one catch of this campaign item. */
    hasReceivedSponsored?: boolean;
  },
  campaign: SponsoredCampaign = DEFAULT_SPONSORED_CAMPAIGN
): boolean {
  if (!campaign.drop.enabled) return false;
  if (input.sponsoredSpawned >= campaign.drop.maxPerRound) return false;
  if (input.spawnedCount !== campaign.drop.spawnIndex) return false;
  // Keep guaranteeing until the item has been received once. Otherwise a miss on
  // round 0 permanently skips the brand drop when laterRoundChance is 0.
  if (campaign.drop.firstRoundGuaranteed && input.hasReceivedSponsored !== true) {
    return true;
  }
  if (input.gamesPlayed <= 0) return campaign.drop.firstRoundGuaranteed;
  return input.random() < campaign.drop.laterRoundChance;
}

/**
 * Pick at most one sponsored campaign for the current drop slot.
 * Unreceived campaigns are preferred so each partner supply can be shown once.
 */
export function selectSponsoredCampaign(input: {
  gamesPlayed: number;
  spawnedCount: number;
  sponsoredSpawned: number;
  receivedSponsoredItemIds: readonly ItemId[];
  random: () => number;
}): SponsoredCampaign | null {
  if (input.sponsoredSpawned >= 1) return null;

  const received = new Set(input.receivedSponsoredItemIds);
  const guaranteed: SponsoredCampaign[] = [];
  const chancePool: SponsoredCampaign[] = [];

  for (const campaign of SPONSORED_CAMPAIGNS) {
    const hasReceived = received.has(campaign.boxItemId);
    if (
      !shouldSpawnSponsoredDrop(
        {
          gamesPlayed: input.gamesPlayed,
          spawnedCount: input.spawnedCount,
          sponsoredSpawned: 0,
          random: input.random,
          hasReceivedSponsored: hasReceived
        },
        campaign
      )
    ) {
      continue;
    }
    if (!hasReceived) guaranteed.push(campaign);
    else chancePool.push(campaign);
  }

  const pool = guaranteed.length > 0 ? guaranteed : chancePool;
  if (pool.length === 0) return null;
  const index = Math.min(pool.length - 1, Math.floor(input.random() * pool.length));
  return pool[index] ?? null;
}
