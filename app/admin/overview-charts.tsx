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

export type AdminDayPoint = { date: string; signups: number; gmv: number };

export function OverviewCharts({ daily }: { daily: AdminDayPoint[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New businesses — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  width={36}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  labelFormatter={(d) => String(d)}
                  formatter={(v) => [v, "Signups"]}
                  contentStyle={{ backgroundColor: "#ffffff" }}
                />
                <Line type="monotone" dataKey="signups" stroke="#006DFF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Settled GMV — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  width={40}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatNumber(Number(v))}
                />
                <Tooltip
                  labelFormatter={(d) => String(d)}
                  formatter={(v) => [formatNumber(Number(v)), "GMV"]}
                  contentStyle={{ backgroundColor: "#ffffff" }}
                />
                <Line type="monotone" dataKey="gmv" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
