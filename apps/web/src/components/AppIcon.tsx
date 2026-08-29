import type { LucideIcon, LucideProps } from "lucide-react";

interface AppIconProps extends Omit<LucideProps, "ref"> {
  icon: LucideIcon;
}

export function AppIcon({ icon: Icon, size = 20, strokeWidth = 2.2, ...props }: AppIconProps) {
  return (
    <Icon aria-hidden="true" focusable="false" size={size} strokeWidth={strokeWidth} {...props} />
  );
}
