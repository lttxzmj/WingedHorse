import type { ItemId } from "@wingedhorse/domain";

export const ITEM_ICON_ASSETS: Record<ItemId, string> = {
  "iced-americano": "/game/item-art/iced-americano.png",
  "nap-mask": "/game/item-art/nap-mask.png",
  "off-work-barrier": "/game/item-art/off-work-barrier.png",
  "steering-wheel-charm": "/game/item-art/steering-wheel-charm.png",
  "main-quest-note": "/game/item-art/main-quest-note.png",
  "refusal-script": "/game/item-art/refusal-script.png",
  "screaming-chicken": "/game/item-art/screaming-chicken.png",
  "mad-note": "/game/item-art/mad-note.png",
  "emotion-valve": "/game/item-art/emotion-valve.png",
  compass: "/game/item-art/compass.png",
  "mentor-card": "/game/item-art/mentor-card.png",
  "sponsored-tent-skin": "/game/item-icons/tent-tree.svg",
  "sponsored-coffee-coupon": "/game/item-icons/ticket.svg"
};

/**
 * Brand photography is opt-in presentation data. It stays separate from the
 * generic icon set so an inactive campaign never changes the ordinary drops.
 */
export const ITEM_BRAND_IMAGE_ASSETS: Partial<Record<ItemId, string>> = {
  "sponsored-tent-skin": "/brands/bluebox/logo.webp",
  "sponsored-coffee-coupon": "/brands/bluebox/pillow-n2.webp"
};
