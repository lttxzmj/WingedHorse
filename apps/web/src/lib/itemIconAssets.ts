import type { ItemId } from "@wingedhorse/domain";

export const ITEM_ICON_ASSETS: Record<ItemId, string> = {
  "iced-americano": "/game/item-art/iced-americano.webp",
  "nap-mask": "/game/item-art/nap-mask.webp",
  "off-work-barrier": "/game/item-art/off-work-barrier.webp",
  "steering-wheel-charm": "/game/item-art/steering-wheel-charm.webp",
  "main-quest-note": "/game/item-art/main-quest-note.webp",
  "refusal-script": "/game/item-art/refusal-script.webp",
  "screaming-chicken": "/game/item-art/screaming-chicken.webp",
  "mad-note": "/game/item-art/mad-note.webp",
  "emotion-valve": "/game/item-art/emotion-valve.webp",
  compass: "/game/item-art/compass.webp",
  "mentor-card": "/game/item-art/mentor-card.webp",
  "sponsored-tent-skin": "/game/item-icons/tent-tree.svg",
  "sponsored-coffee-coupon": "/game/item-icons/ticket.svg",
  "sponsored-liberlive-aqua": "/game/item-icons/ticket.svg",
  "sponsored-liberlive-sun": "/game/item-icons/ticket.svg"
};

/**
 * Brand logo marks for drop / list identity. Product photos live on the campaign
 * config (`productImage`) and are only shown after the user opens welfare.
 */
export const ITEM_BRAND_IMAGE_ASSETS: Partial<Record<ItemId, string>> = {
  "sponsored-tent-skin": "/brands/bluebox/logo.webp",
  "sponsored-coffee-coupon": "/brands/bluebox/logo.webp",
  "sponsored-liberlive-aqua": "/brands/liberlive/logo.webp",
  "sponsored-liberlive-sun": "/brands/liberlive/logo.webp"
};
