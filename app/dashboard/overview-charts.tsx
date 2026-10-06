"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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
    <Card className="border-0 bg-white bg-none shadow-none md:border-0 md:bg-gradient-to-br md:from-gray-100 md:to-gray-200">
      <CardHeader className="px-0 pt-0 md:p-6">
        <CardTitle>Orders — last 14 days</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 md:p-6 md:pt-0">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace("-", "/")} tick={{ fontSize: 11 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(Number(v))} />
              <Tooltip labelFormatter={(d) => String(d)} formatter={(v) => [v, "Orders"]} />
              <Line type="monotone" dataKey="orders" stroke="#0066ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
