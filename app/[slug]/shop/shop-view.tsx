"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, ShoppingCart, X, Plus, Minus, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";

export type ShopProduct = {
  id: string;
  public_id: string | null;
  name: string;
  price: number;
  currency: string;
  image_url: string | null;
  in_stock: boolean;
};

type CartItem = ShopProduct & { qty: number };

export function ShopView({
  businessName,
  businessSlug,
  currency,
  products,
}: {
  businessName: string;
  businessSlug: string;
  currency: string;
  products: ShopProduct[];
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "soldout">("all");

  const add = (p: ShopProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...p, qty: 1 }];
    });
  };
  const remove = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));
  const setQty = (id: string, qty: number) => {
    if (qty <= 0) return remove(id);
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const filtered = products.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "available" && !p.in_stock) return false;
    if (filter === "soldout" && p.in_stock) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{businessName}</h1>
          <p className="text-xs text-muted-foreground">Shop</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${businessSlug}`}
            className="rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-100"
          >
            Chat
          </Link>
          <button
            onClick={() => setOpen(true)}
          className="relative flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {totalQty > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-yellow-400 text-[11px] font-bold text-white">
              {totalQty}
            </span>
          )}
        </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Package className="mb-3 h-10 w-10" />
            <p>No products yet.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {(["all", "available", "soldout"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-gradient-to-r from-red-500 to-yellow-400 text-white"
                      : "bg-gray-100 text-zinc-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {f === "all" ? "All" : f === "available" ? "Available" : "Sold out"}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-xl border-0 bg-white px-4 py-2 text-sm shadow-sm focus-visible:outline-none dark:bg-zinc-900 sm:w-64"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => {
              const soldOut = !p.in_stock;
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900"
                >
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      width={400}
                      height={400}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-zinc-800">
                      <Package size={40} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 p-3">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.name}</p>
                    <p className="text-sm font-bold text-[#0866FF]">
                      {formatCurrency(p.price, p.currency)}
                    </p>
                    {p.public_id && (
                      <p className="font-mono text-[11px] text-neutral-500">{p.public_id}</p>
                    )}
                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => add(p)}
                      className="mt-1 w-full rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      {soldOut ? "Sold out" : "Add to cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Your cart</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {cart.map((i) => (
                    <li key={i.id} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {i.image_url ? (
                          <Image src={i.image_url} alt={i.name} width={48} height={48} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <Package size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{i.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(i.price, i.currency)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(i.id, i.qty - 1)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm">{i.qty}</span>
                        <button onClick={() => setQty(i.id, i.qty + 1)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-gray-100 p-4 dark:border-zinc-800">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(total, currency)}
                  </span>
                </div>
                <Link
                  href={`/${businessSlug}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-600"
                >
                  Checkout via chat
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
