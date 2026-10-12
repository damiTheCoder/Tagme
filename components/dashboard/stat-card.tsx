import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IconBadge } from "./icon-badge";

const VARIANTS = {
  white: {
    label: "text-sm font-medium text-gray-500 dark:text-zinc-400",
    value: "text-2xl md:text-3xl font-semibold tabular-nums text-[#1a1a1a] dark:text-zinc-100",
  },
  blue: {
    label: "text-sm font-medium text-gray-500 dark:text-zinc-400",
    value: "text-2xl md:text-3xl font-semibold tabular-nums text-[#1a1a1a] dark:text-zinc-100",
  },
  dark: {
    label: "text-sm font-medium text-gray-500 dark:text-zinc-400",
    value: "text-2xl md:text-3xl font-semibold tabular-nums text-[#1a1a1a] dark:text-zinc-100",
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
    <Card className={cn("bg-gray-100 dark:bg-zinc-800", className)}>
      <CardContent className={contentClassName ?? "p-4 md:p-6"}>
        <div className="mb-2 flex items-center gap-2">
          {icon && (
            <IconBadge
              icon={icon}
              variant={iconVariant ?? "blue"}
            />
          )}
          <p className={v.label}>{title}</p>
        </div>
        <p className={v.value}>{value}</p>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs",
              trendTone === "up" && "text-green-600",
              trendTone === "down" && "text-red-600",
              trendTone === "neutral" && "text-gray-500"
            )}
          >
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
