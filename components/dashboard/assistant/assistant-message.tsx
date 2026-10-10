"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Check, CheckCircle2, Copy, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";

export type ToolPart = {
  type: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export function toolNameOf(part: { type: string; toolName?: string }): string | null {
  if (part.type === "dynamic-tool" && part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-[#1a1a1a] transition-colors hover:bg-gray-200"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function StatRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((s) => (
        <div key={s.label} className="rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-[11px] text-gray-500">{s.label}</p>
          <p className="truncate text-sm font-semibold text-[#1a1a1a]">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

const WRITE_TOOLS: Record<string, { label: string; viewHref: (input: Record<string, unknown>) => string }> = {
  approve_order: { label: "Order approved", viewHref: () => "/dashboard/orders" },
  decline_order: { label: "Order declined", viewHref: () => "/dashboard/orders" },
  create_product: { label: "Product created", viewHref: () => "/dashboard/products" },
  update_product: { label: "Product updated", viewHref: () => "/dashboard/products" },
  delete_product: { label: "Product deleted", viewHref: () => "/dashboard/products" },
  update_business_settings: { label: "Settings updated", viewHref: () => "/dashboard/settings" },
  update_order_note: {
    label: "Note saved",
    viewHref: (input) =>
      typeof input.order_id === "string" ? `/dashboard/orders/${input.order_id}` : "/dashboard/orders",
  },
  adjust_product_stock: { label: "Stock adjusted", viewHref: () => "/dashboard/inventory" },
};

export const WRITE_TOOL_NAMES = Object.keys(WRITE_TOOLS);

function WriteResult({ name, part }: { name: string; part: ToolPart }) {
  const meta = WRITE_TOOLS[name];
  const out = asRecord(part.output);
  if (part.state === "output-error" || (out.ok === false && out.error !== "User confirmation required")) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#1a1a1a]">
        <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
        <span>{typeof out.error === "string" ? out.error : part.errorText || "Something went wrong."}</span>
      </div>
    );
  }
  if (out.ok === false) {
    return (
      <div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm text-[#1a1a1a]">
        Confirmation is needed before I can do that — please confirm and I’ll proceed.
      </div>
    );
  }
  const input = asRecord(part.input);
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-[#1a1a1a]">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
      <span className="flex-1">{meta?.label ?? "Done"}</span>
      {meta && (
        <Link href={meta.viewHref(input)} className="shrink-0 font-medium underline">
          View
        </Link>
      )}
    </div>
  );
}

function ReadResult({ name, part }: { name: string; part: ToolPart }) {
  const out = asRecord(part.output);

  switch (name) {
    case "get_sales_summary": {
      const daily = (out.daily ?? []) as { date: string; orders: number; revenue: number }[];
      return (
        <div className="flex flex-col gap-2">
          <StatRow
            items={[
              { label: "Orders", value: formatNumber(Number(out.total_orders ?? 0)) },
              {
                label: "Revenue",
                value: formatCurrency(Number(out.total_revenue ?? 0), String(out.currency ?? "")),
              },
              { label: "Range", value: String(out.range ?? "") },
            ]}
          />
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace("-", "/")} tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(daily.length / 6))} />
                <Tooltip labelFormatter={(d) => String(d)} />
                <Line type="monotone" dataKey="revenue" stroke="#006DFF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    case "get_orders": {
      const orders = (out.orders ?? []) as {
        id: string;
        customer_name: string;
        items_summary: string;
        total: number;
        currency: string;
        status: string;
        created_at: string;
      }[];
      if (orders.length === 0) return <p className="text-sm text-gray-500">No orders found.</p>;
      return (
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1a1a1a]">{o.customer_name}</p>
                <p className="truncate text-xs text-gray-500">{o.items_summary}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-[#1a1a1a]">
                  {formatCurrency(Number(o.total), String(o.currency))}
                </p>
                <OrderStatusBadge status={o.status} />
              </div>
              <Link href={`/dashboard/orders/${o.id}`} className="shrink-0 text-xs font-medium underline">
                View
              </Link>
            </div>
          ))}
        </div>
      );
    }

    case "get_order_detail": {
      const order = asRecord(out.order);
      const customer = asRecord(out.customer);
      const messages = (out.messages ?? []) as { role: string; content: string; created_at: string }[];
      return (
        <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#1a1a1a]">
              {formatCurrency(Number(order.total ?? 0), String(order.currency ?? ""))}
            </span>
            <OrderStatusBadge status={String(order.status ?? "")} />
          </div>
          <p className="text-xs text-gray-500">{String(order.items_summary ?? "")}</p>
          {customer.name != null && (
            <p className="text-xs text-gray-500">
              {String(customer.name ?? "")} {customer.phone ? `· ${String(customer.phone)}` : ""}
            </p>
          )}
          {messages.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-t border-gray-200 pt-2">
              {messages.slice(-6).map((m, i) => (
                <p key={i} className="truncate text-xs text-gray-600">
                  <span className="font-medium">{m.role}:</span> {m.content}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "get_top_products": {
      const products = (out.products ?? []) as { name: string; count: number; revenue: number }[];
      if (products.length === 0) return <p className="text-sm text-gray-500">No product sales in this range.</p>;
      return (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={products} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#006DFF" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case "get_customer_count": {
      return (
        <StatRow
          items={[
            { label: "Total", value: formatNumber(Number(out.total ?? 0)) },
            { label: "New this week", value: formatNumber(Number(out.new_this_week ?? 0)) },
            { label: "New this month", value: formatNumber(Number(out.new_this_month ?? 0)) },
          ]}
        />
      );
    }

    case "get_customer_list": {
      const customers = (out.customers ?? []) as {
        name: string;
        phone: string | null;
        order_count: number;
        total_spent: number;
        currency: string;
      }[];
      if (customers.length === 0) return <p className="text-sm text-gray-500">No customers yet.</p>;
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right">{formatNumber(c.order_count)}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(c.total_spent), String(c.currency))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    case "get_business_info": {
      const rows: [string, unknown][] = [
        ["Name", out.name],
        ["Description", out.description],
        ["Hours", out.hours],
        ["Policies", out.policies],
        ["Currency", out.currency],
        ["Notifications", out.notification_email],
      ];
      return (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-gray-50 p-3 text-sm">
          {rows
            .filter(([, v]) => v != null && String(v).trim() !== "")
            .map(([k, v]) => (
              <p key={k} className="text-[#1a1a1a]">
                <span className="text-gray-500">{k}: </span>
                {String(v)}
              </p>
            ))}
        </div>
      );
    }

    case "get_public_link": {
      const url = String(out.url ?? "");
      return (
        <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3">
          <p className="min-w-0 flex-1 truncate text-sm text-[#1a1a1a]">{url}</p>
          <CopyButton text={url} />
        </div>
      );
    }

    case "get_pending_order_count": {
      return (
        <div className="w-40">
          <StatCard title="Pending orders" value={formatNumber(Number(out.count ?? 0))} />
        </div>
      );
    }

    case "get_revenue_trend": {
      const daily = (out.daily ?? []) as { date: string; revenue: number }[];
      return (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace("-", "/")} tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(daily.length / 6))} />
              <Tooltip labelFormatter={(d) => String(d)} />
              <Line type="monotone" dataKey="revenue" stroke="#006DFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case "get_conversion_stats": {
      return (
        <StatRow
          items={[
            { label: "Conversations", value: formatNumber(Number(out.total_conversations ?? 0)) },
            { label: "With orders", value: formatNumber(Number(out.conversations_with_orders ?? 0)) },
            { label: "Conversion", value: `${Number(out.conversion_rate ?? 0)}%` },
          ]}
        />
      );
    }

    case "search_products": {
      const products = (out.products ?? out ?? []) as {
        id: string;
        name: string;
        price: number;
        in_stock: boolean;
        currency?: string;
      }[];
      const list = Array.isArray(products) ? products : [];
      if (list.length === 0) return <p className="text-sm text-gray-500">No matching products.</p>;
      return (
        <div className="flex flex-col gap-1.5">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-[#1a1a1a]">{p.name}</span>
              <span className="shrink-0 text-gray-500">
                {p.currency ? formatCurrency(Number(p.price), String(p.currency)) : String(p.price)}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                  p.in_stock ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                }`}
              >
                {p.in_stock ? "In stock" : "Out"}
              </span>
            </div>
          ))}
        </div>
      );
    }

    case "get_low_stock_products":
    case "get_out_of_stock_products": {
      const products = (out.products ?? []) as {
        id: string;
        name: string;
        stock_count?: number | null;
        low_stock_threshold?: number | null;
        price: number;
        currency: string;
      }[];
      if (products.length === 0)
        return (
          <p className="text-sm text-gray-500">
            {name === "get_low_stock_products"
              ? "Nothing is running low."
              : "Nothing is sold out."}
          </p>
        );
      return (
        <div className="flex flex-col gap-1.5">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  p.stock_count === 0 ? "bg-red-500" : "bg-amber-500"
                }`}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-[#1a1a1a]">{p.name}</span>
              <span className="shrink-0 text-gray-500">
                {p.stock_count ?? "—"} left
              </span>
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}

export function AssistantToolPart({ part }: { part: ToolPart }) {
  const name = toolNameOf(part);
  if (!name) return null;
  if (part.state === "input-streaming" || part.state === "input-available") return null;
  if (name in WRITE_TOOLS) return <WriteResult name={name} part={part} />;
  if (part.state === "output-error") {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#1a1a1a]">
        <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
        <span>{part.errorText || "Something went wrong."}</span>
      </div>
    );
  }
  if (part.state !== "output-available") return null;
  return <ReadResult name={name} part={part} />;
}
