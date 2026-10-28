"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Copy, Check, Landmark } from "lucide-react";
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

type BankPayment = {
  charge_id?: string;
  checkout_id?: string;
  account_number: string;
  account_name?: string;
  bank_name: string;
  expires_at?: string;
  amount?: string;
  currency?: string;
  reference?: string;
  payment_reference?: string;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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
  const [payment, setPayment] = useState<BankPayment | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick a countdown while the account is displayed.
  useEffect(() => {
    if (!payment || paid) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [payment, paid]);

  // Poll for confirmation (webhook-driven; this just reflects it promptly).
  useEffect(() => {
    if (!payment || paid) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/checkout/order?orderId=${encodeURIComponent(orderId)}`
        );
        const data = await res.json();
        if (res.ok && data.ok && data.paid) {
          setPaid(true);
        }
      } catch {
        // Transient — next tick retries.
      }
    }, 4000);
    return () => clearInterval(id);
  }, [payment, paid, orderId]);

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
      const p = data?.payment as BankPayment | undefined;
      if (!res.ok || !data.ok || !p || typeof p.account_number !== "string") {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      setPayment(p);
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!payment?.account_number) return;
    // Flip the feedback immediately — awaiting the clipboard promise can hang
    // (headless/slow permission prompts), and the user deserves instant ack.
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    try {
      await navigator.clipboard.writeText(payment.account_number);
    } catch {
      // Clipboard blocked — fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = payment.account_number;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // Give up silently — the number is still visible on screen.
      }
      document.body.removeChild(ta);
    }
  }

  const naira = `₦${Math.round(total).toLocaleString()}`;

  if (paid) {
    return (
      <div className="flex max-w-[85%] flex-col items-start gap-1 self-start rounded-2xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
        <p className="text-sm font-medium text-green-700 dark:text-green-300">
          ✅ Payment received
        </p>
        <p className="text-xs text-green-700/80 dark:text-green-300/80">
          Your order is confirmed. {businessName} will be in touch.
        </p>
      </div>
    );
  }

  if (payment) {
    const remaining = payment.expires_at
      ? new Date(payment.expires_at).getTime() - now
      : null;
    const expired = remaining !== null && remaining <= 0;
    return (
      <div className="flex w-full max-w-[300px] flex-col gap-3 self-start rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Landmark size={16} className="text-[#0866FF]" />
          Pay by bank transfer
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Bank</p>
          <p className="text-sm font-medium">{payment.bank_name}</p>
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Account number</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold tracking-wide">
              {payment.account_number}
            </span>
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy account number"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-zinc-800"
            >
              {copied ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
          {payment.account_name && (
            <p className="text-xs text-muted-foreground">{payment.account_name}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Transfer exactly <span className="font-semibold text-foreground">{naira}</span> to
          this account. Your order will be confirmed automatically.
        </p>

        {payment.payment_reference && (
          <p className="text-[11px] text-muted-foreground">
            Ref: <span className="font-mono">{payment.payment_reference}</span>
          </p>
        )}

        {expired ? (
          <button
            type="button"
            onClick={() => setPayment(null)}
            className="rounded-full bg-gradient-to-r from-[#0866FF] via-[#4C8DFF] to-[#00C6FF] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Get new account details
          </button>
        ) : (
          remaining !== null && (
            <p className="text-[11px] text-muted-foreground">
              Account expires in{" "}
              <span className="font-medium text-foreground">
                {formatCountdown(remaining)}
              </span>
            </p>
          )
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 self-start">
      <button
        type="button"
        onClick={onPay}
        disabled={loading}
        className="rounded-full bg-gradient-to-r from-[#0866FF] via-[#4C8DFF] to-[#00C6FF] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Preparing account…" : `Pay Now · ${naira}`}
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
                      ? "self-end bg-[#0866FF] text-white"
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
