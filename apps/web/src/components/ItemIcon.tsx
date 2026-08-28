import type { ItemId } from "@wingedhorse/domain";
import {
  Badge,
  Bird,
  Coffee,
  Compass,
  EyeClosed,
  Gauge,
  Hand,
  NotebookPen,
  ShieldCheck,
  StickyNote,
  TentTree,
  Ticket,
  type LucideIcon
} from "lucide-react";
import { AppIcon } from "./AppIcon";

export const ITEM_ICON_COMPONENTS: Record<ItemId, LucideIcon> = {
  "iced-americano": Coffee,
  "nap-mask": EyeClosed,
  "off-work-barrier": ShieldCheck,
  "steering-wheel-charm": Gauge,
  "main-quest-note": StickyNote,
  "refusal-script": Hand,
  "screaming-chicken": Bird,
  "mad-note": NotebookPen,
  "emotion-valve": Gauge,
  compass: Compass,
  "mentor-card": Badge,
  "sponsored-tent-skin": TentTree,
  "sponsored-coffee-coupon": Ticket
};

export function ItemIcon({ itemId, size = 22 }: { itemId: ItemId; size?: number }) {
  return <AppIcon icon={ITEM_ICON_COMPONENTS[itemId]} size={size} />;
}
