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
    <Card>
      <CardHeader>
        <CardTitle>Orders — last 14 days</CardTitle>
      </CardHeader>
      <CardContent>
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
