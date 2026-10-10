import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  blue: "bg-[#7dd3fc20] text-[#0c4a6e]",
  purple: "bg-[#a78bfa20] text-[#7c3aed]",
  "purple-solid": "bg-[#7c3aed] text-white",
  dark: "bg-white/10 text-white",
  light: "bg-gray-100 text-[#1a1a1a]",
} as const;

export function IconBadge({
  icon: Icon,
  variant = "blue",
  className,
}: {
  icon: LucideIcon;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        VARIANTS[variant],
        className
      )}
    >
      <Icon size={20} />
    </span>
  );
}
