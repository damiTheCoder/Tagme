"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { DailyPoint } from "./analytics";

function formatMoney(total: number, currency: string) {
  return formatCurrency(total, currency);
}

export function AnalyticsView({
  daily,
  currency,
  totalOrders,
  totalRevenue,
  repeatCustomers,
  conversionRate,
  topProducts,
}: {
  daily: DailyPoint[];
  currency: string;
  totalOrders: number;
  totalRevenue: number;
  repeatCustomers: number;
  conversionRate: number;
  topProducts: { name: string; count: number }[];
}) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const sliced = daily.slice(-days);
  const topMax = Math.max(1, ...topProducts.map((t) => t.count));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Track orders, revenue, and your best sellers."
        action={
          <Tabs value={range} onValueChange={(v) => setRange(v as "7d" | "30d" | "90d")}>
            <TabsList>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total orders" value={String(totalOrders)} />
        <StatCard title="Total revenue" value={formatMoney(totalRevenue, currency)} />
        <StatCard title="Repeat customers" value={String(repeatCustomers)} />
        <StatCard title="Conversion rate" value={`${conversionRate}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue per day ({currency})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sliced}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a8fe65" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#a8fe65" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace("-", "/")} tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(sliced.length / 8))} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(Number(v))} />
                <Tooltip labelFormatter={(d) => String(d)} formatter={(v) => [`${currency} ${v}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#3d7a0a" strokeWidth={2} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders per day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sliced}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace("-", "/")} tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(sliced.length / 8))} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(Number(v))} />
                <Tooltip labelFormatter={(d) => String(d)} formatter={(v) => [v, "Orders"]} />
                <Bar dataKey="orders" fill="#a8fe65" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No product data yet.</p>
          ) : (
            topProducts.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm font-medium">{p.name}</span>
                <Progress value={Math.round((p.count / topMax) * 100)} className="flex-1" />
                <span className="w-20 text-right text-sm text-gray-500">
                  {formatNumber(p.count)} order{p.count === 1 ? "" : "s"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
