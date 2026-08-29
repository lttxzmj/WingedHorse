import type { ItemId } from "@wingedhorse/domain";
import { ITEM_BRAND_IMAGE_ASSETS, ITEM_ICON_ASSETS } from "../lib/itemIconAssets";

export function ItemIcon({ itemId, size = 22 }: { itemId: ItemId; size?: number }) {
  const src = ITEM_BRAND_IMAGE_ASSETS[itemId] ?? ITEM_ICON_ASSETS[itemId];

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ display: "block", width: size, height: size, objectFit: "contain" }}
    />
  );
}
