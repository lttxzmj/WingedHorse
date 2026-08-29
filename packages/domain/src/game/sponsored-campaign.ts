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
  /** Product code as printed on the product photo (pillow N2). */
  productCode: string;
  /** Logo path — drop / source recognition. */
  logoImage: string;
  /** Product photo path — welfare / inventory product view. */
  productImage: string;
  boxItemId: ItemId;
  drop: SponsoredDropPolicy;
  welfare: SponsoredWelfare;
}

/**
 * Copy and marks below are taken only from files in
 * `apps/web/public/brands/bluebox/` (logo.webp, pillow-n2.webp).
 * Do not invent product names or marketing lines here.
 */
export const DEFAULT_SPONSORED_CAMPAIGN: SponsoredCampaign = {
  id: "bluebox-niumao-2026",
  partnerId: "bluebox",
  partnerName: "蓝盒子",
  partnerNameEn: "BLUE BOX",
  productCode: "N2",
  logoImage: "/brands/bluebox/logo.webp",
  productImage: "/brands/bluebox/pillow-n2.webp",
  boxItemId: "sponsored-coffee-coupon",
  drop: {
    enabled: true,
    firstRoundGuaranteed: true,
    laterRoundChance: 0,
    maxPerRound: 1,
    spawnIndex: 0
  },
  welfare: {
    name: "牛毛",
    hint: "领牛毛",
    qrImage: "/brands/bluebox/welfare-qr.svg",
    disclosure: "",
    demoQr: true
  }
};

export function sponsoredProductLabel(
  campaign: SponsoredCampaign = DEFAULT_SPONSORED_CAMPAIGN
): string {
  return `${campaign.partnerName} ${campaign.productCode}`;
}

export function sponsoredDisplayName(campaign: SponsoredCampaign = DEFAULT_SPONSORED_CAMPAIGN): string {
  return campaign.welfare.name;
}

export function sponsoredDropDefinition(campaign: SponsoredCampaign = DEFAULT_SPONSORED_CAMPAIGN): DropDefinition {
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
