"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";

export type DayPoint = { date: string; orders: number; revenue: number };

export function OverviewCharts({ daily }: { daily: DayPoint[] }) {
  return (
    <Card>
      <CardHeader className="px-4 pt-4 md:p-6">
        <CardTitle>Orders — last 14 days</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 md:p-6 md:pt-0">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#006DFF" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#006DFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                width={32}
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatNumber(Number(v))}
              />
              <Tooltip
                labelFormatter={(d) => String(d)}
                formatter={(v) => [v, "Orders"]}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 1px 2px rgba(0,0,0,0.02)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#006DFF"
                strokeWidth={2}
                fill="url(#overviewFill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
