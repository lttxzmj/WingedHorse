import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppIcon } from "./AppIcon";

interface BackLinkProps {
  to: string;
  label: string;
}

export function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link to={to} aria-label={label}>
      <AppIcon icon={ArrowLeft} size={22} />
    </Link>
  );
}
