"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ProductCarousel, type CarouselProduct } from "./product-carousel";

export type { CarouselProduct };

export function messageText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n");
}

function toolNameOf(part: {
  type: string;
  toolName?: string;
}): string | null {
  if (part.type === "dynamic-tool" && part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return null;
}

function orderOutput(message: UIMessage): { orderId: string; total: number } | null {
  if (!Array.isArray(message.parts)) return null;
  for (const p of message.parts) {
    const part = p as {
      type: string;
      toolName?: string;
      state?: string;
      output?: unknown;
    };
    if (toolNameOf(part) !== "create_order" || part.state !== "output-available") continue;
    const out = (part.output ?? {}) as { order_id?: unknown; total?: unknown };
    if (typeof out.order_id === "string" && out.order_id && Number.isFinite(Number(out.total))) {
      return { orderId: out.order_id, total: Number(out.total) };
    }
  }
  return null;
}

function PayNowButton({
  orderId,
  total,
  businessName,
}: {
  orderId: string;
  total: number;
  businessName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount: String(total), businessName }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || typeof data.url !== "string") {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 self-start">
      <button
        type="button"
        onClick={onPay}
        disabled={loading}
        className="rounded-full bg-gradient-to-r from-[#7c3aed] via-[#c026d3] to-[#f59e0b] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Opening checkout…" : `Pay Now · ₦${Math.round(total).toLocaleString()}`}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function catalogProducts(message: UIMessage): CarouselProduct[] | null {
  if (!Array.isArray(message.parts)) return null;
  for (const p of message.parts) {
    const part = p as {
      type: string;
      toolName?: string;
      state?: string;
      output?: unknown;
    };
    const name =
      part.type === "dynamic-tool" && part.toolName
        ? part.toolName
        : part.type.startsWith("tool-")
          ? part.type.slice("tool-".length)
          : null;
    if (name !== "show_product_catalog" || part.state !== "output-available") continue;
    const out = (part.output ?? {}) as { products?: unknown };
    if (Array.isArray(out.products) && out.products.length > 0) {
      return out.products as CarouselProduct[];
    }
  }
  return null;
}

export function ChatMessages({
  messages,
  busy,
  onSelectProduct,
  initialProducts = [],
  businessName,
}: {
  messages: UIMessage[];
  busy: boolean;
  onSelectProduct: (product: CarouselProduct) => void;
  initialProducts?: CarouselProduct[];
  businessName: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  // Auto-show the catalog at the end of the scroll flow until the
  // customer sends their first message. Rendered in-flow (not as a
  // sibling below the scroll area) so it never clips the last message.
  const showInitialCatalog =
    initialProducts.length > 0 &&
    !messages.some((m) => m.role === "user");

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && !busy && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Say hello to start your order 👋
        </p>
      )}
      <div className="flex flex-col gap-2">
        {messages.map((m) => {          const text = messageText(m);
          const catalog = m.role === "assistant" ? catalogProducts(m) : null;
          const payNow = m.role === "assistant" ? orderOutput(m) : null;
          if (!text && !catalog && !payNow) return null;
          if (m.role === "system") {
            if (!text) return null;
            return (
              <div
                key={m.id}
                className="self-center rounded-full bg-neutral-100 px-3 py-1 text-center text-xs text-muted-foreground dark:bg-zinc-800"
              >
                {text}
              </div>
            );
          }
          const isUser = m.role === "user";
          return (
            <div key={m.id} className="flex flex-col gap-2">
              {text.trim() ? (
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    isUser
                      ? "self-end bg-[#0066ff] text-white"
                      : "self-start bg-neutral-100 text-neutral-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{text}</p>
                </div>
              ) : null}
              {catalog && !isUser && (
                <div className="w-full min-w-0 self-start overflow-hidden">
                  <ProductCarousel products={catalog} onSelect={onSelectProduct} />
                </div>
              )}
              {payNow && !isUser && (
                <PayNowButton
                  orderId={payNow.orderId}
                  total={payNow.total}
                  businessName={businessName}
                />
              )}
            </div>
          );
        })}
        {showInitialCatalog && (
          <div className="mt-1">
            <ProductCarousel products={initialProducts} onSelect={onSelectProduct} />
          </div>
        )}
        {busy && (
          <div className="flex items-center gap-1 self-start rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-zinc-800">
            <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-neutral-400"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-neutral-400"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
