import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IconBadge } from "./icon-badge";

const VARIANTS = {
  white: {
    card: "bg-[#59a1ff]",
    label: "text-sm font-medium text-white",
    value: "text-3xl font-semibold tabular-nums text-white",
  },
  blue: {
    card: "bg-[#7dd3fc15]",
    label: "text-sm font-medium text-gray-500",
    value: "text-3xl font-semibold tabular-nums text-[#1a1a1a]",
  },
  dark: {
    card: "bg-[#1a1a1a]",
    label: "text-sm font-medium text-gray-400",
    value: "text-3xl font-semibold tabular-nums text-white",
  },
} as const;

export function StatCard({
  title,
  value,
  trend,
  trendTone = "neutral",
  variant = "white",
  icon,
  iconVariant,
  className,
  contentClassName,
}: {
  title: string;
  value: string;
  trend?: string;
  trendTone?: "up" | "down" | "neutral";
  variant?: keyof typeof VARIANTS;
  icon?: LucideIcon;
  iconVariant?: "blue" | "purple" | "purple-solid" | "dark" | "light";
  className?: string;
  contentClassName?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <Card className={cn("border-0", v.card, className)}>
      <CardContent className={contentClassName ?? "p-6"}>
        <div className="mb-2 flex items-center gap-2.5">
          {icon && (
            <IconBadge
              icon={icon}
              variant={iconVariant ?? (variant === "dark" ? "dark" : variant === "blue" ? "blue" : "dark")}
            />
          )}
          <p className={v.label}>{title}</p>
        </div>
        <p className={v.value}>{value}</p>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs",
              variant === "dark"
                ? "text-gray-400"
                : variant === "white"
                  ? "text-white"
                  : trendTone === "up"
                    ? "text-green-600"
                    : trendTone === "down"
                      ? "text-red-600"
                      : "text-gray-500"
            )}
          >
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
