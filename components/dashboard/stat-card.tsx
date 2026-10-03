import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  trend,
  trendTone = "neutral",
}: {
  title: string;
  value: string;
  trend?: string;
  trendTone?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-[#1a1a1a]/60">{title}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-[#1a1a1a]">{value}</p>
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
