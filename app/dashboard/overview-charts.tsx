"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/format";
import { useTheme } from "next-themes";

export type DayPoint = { date: string; orders: number; revenue: number };

const SAMPLE: DayPoint[] = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-01-${String(i + 1).padStart(2, "0")}`,
  orders: [2, 4, 3, 6, 5, 8, 4, 7, 5, 9, 6, 8, 7, 10][i],
  revenue: 0,
}));

export function OverviewCharts({ daily }: { daily: DayPoint[] }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const grid = dark ? "#27272a" : "#f3f4f6";
  const tickFill = dark ? "#a1a1aa" : "#9ca3af";
  const tooltipBg = dark ? "#18181b" : "#ffffff";
  const empty = !daily || daily.length === 0 || daily.every((d) => d.orders === 0 && d.revenue === 0);
  const data = empty ? SAMPLE : daily;
  return (
    <div className="w-full">
      {empty && (
        <p className="mb-2 text-center text-xs text-gray-400">
          Sample preview — live chart begins with your first sale.
        </p>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
              tick={{ fontSize: 12, fill: tickFill }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              width={32}
              allowDecimals={false}
              tick={{ fontSize: 12, fill: tickFill }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatNumber(Number(v))}
            />
            <Tooltip
              labelFormatter={(d) => String(d)}
              formatter={(v) => [v, "Orders"]}
              contentStyle={{
                backgroundColor: tooltipBg,
                borderRadius: 12,
                border: "none",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 1px 2px rgba(0,0,0,0.02)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="orders" fill="#a8fe65" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
