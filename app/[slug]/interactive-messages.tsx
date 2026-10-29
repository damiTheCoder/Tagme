"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Landmark, ShoppingBag } from "lucide-react";
import type {
  InteractiveButtons,
  InteractiveList,
  PaymentCard as PaymentCardPart,
} from "@/lib/chat/interactive";

/**
 * Phase 2's renderer: rigid components the customer clicks instead of typing.
 *
 * None of these ever involve the model. They are deliberately shaped like the
 * future WhatsApp surface — a list with opaque reply ids, a row of up to
 * three pill buttons, and a content card.
 */

type SelectHandler = (replyId: string, label?: string) => void;

function currencySymbol(code: string) {
  switch ((code || "").toUpperCase()) {
    case "NGN":
      return "₦";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "KES":
      return "KSh";
    case "ZAR":
      return "R";
    default:
      return `${code} `;
  }
}

function formatMoney(amount: number, currency: string) {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${currencySymbol(currency)}${n.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ list */

export function InteractiveList({
  part,
  answered,
  onSelect,
}: {
  part: InteractiveList;
  answered?: boolean;
  onSelect: SelectHandler;
}) {
  const items = part.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className="w-full self-start overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-zinc-800">
        <p className="text-sm font-semibold">{part.title}</p>
        {part.body && (
          <p className="mt-0.5 text-xs text-muted-foreground">{part.body}</p>
        )}
      </div>

      {/* Vertical + scrollable, per spec. */}
      <div className="max-h-[420px] overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 dark:border-zinc-800"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-zinc-800">
              {item.image_url ? (
                // Vendor-supplied artwork; unoptimised domains fall back to
                // the letter tile below via onError.
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                  <ShoppingBag size={20} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {formatMoney(item.price, item.currency)}
                </span>
                {item.in_stock === false && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-zinc-800">
                    Sold out
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={answered || item.in_stock === false}
              onClick={() => onSelect(item.id, item.name)}
              className="shrink-0 rounded-full bg-[#0866FF] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0866FF]/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {answered ? "Selected" : "Select"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- buttons */

export function InteractiveButtons({
  part,
  answered,
  onSelect,
}: {
  part: InteractiveButtons;
  answered?: boolean;
  onSelect: SelectHandler;
}) {
  const buttons = part.buttons ?? [];
  const custom = part.custom_input;
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset when a fresh question arrives.
  useEffect(() => {
    setShowInput(false);
    setValue("");
    setError(null);
  }, [part.body, part.buttons]);

  function submitCustom() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < (custom?.min ?? 1) || n > (custom?.max ?? 100)) {
      setError(`Enter a number from ${custom?.min ?? 1} to ${custom?.max ?? 100}.`);
      return;
    }
    setError(null);
    // Same reply-id vocabulary as a button, so the backend needs no new case.
    onSelect(`qty_${n}`, String(n));
  }

  return (
    <div className="flex w-full max-w-[340px] flex-col items-start gap-2 self-start rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-sm font-medium">{part.body}</p>

      {answered ? (
        <p className="text-xs text-muted-foreground">✓ Choice sent</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {buttons.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  if (b.id === "qty_custom" && custom) {
                    setShowInput((v) => !v);
                    return;
                  }
                  onSelect(b.id, b.title);
                }}
                className={
                  b.style === "primary"
                    ? "rounded-full bg-[#0866FF] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0866FF]/90"
                    : "rounded-full border border-[#0866FF]/40 bg-white px-4 py-1.5 text-sm font-semibold text-[#0866FF] transition-colors hover:bg-[#0866FF]/10 dark:bg-zinc-900"
                }
              >
                {b.title}
              </button>
            ))}
          </div>

          {showInput && custom && (
            <div className="flex w-full items-center gap-2">
              <input
                autoFocus
                inputMode="numeric"
                value={value}
                min={custom.min}
                max={custom.max}
                placeholder={custom.placeholder ?? "Quantity"}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCustom();
                  }
                }}
                className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={submitCustom}
                className="rounded-full bg-[#0866FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0866FF]/90"
              >
                Use this
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- payment card */

/**
 * Bank-transfer details with copy button and countdown — the Phase 2 payment
 * step. Polls the order status, and once payment lands it asks the backend
 * for the AI's closing message (the webhook normally gets there first;
 * `complete_flow` is idempotent so this is only a fallback).
 */
export function PaymentCard({
  part,
  onPaid,
}: {
  part: PaymentCardPart;
  onPaid?: (orderId: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (paid) return;
    let stopped = false;
    const id = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/checkout/order?orderId=${encodeURIComponent(part.order_id)}`
        );
        const data = await res.json();
        if (!stopped && res.ok && data.ok && data.paid) {
          setPaid(true);
          clearInterval(id);
          onPaid?.(part.order_id);
        }
      } catch {
        // Transient — next tick retries.
      }
    }, 4000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [paid, part.order_id, onPaid]);

  async function onCopy() {
    if (!part.account_number) return;
    // Flip feedback immediately — awaiting the clipboard promise can hang.
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    try {
      await navigator.clipboard.writeText(part.account_number);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = part.account_number;
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

  const amount = Number(part.amount || 0);
  const naira = `${currencySymbol(part.currency)}${Math.round(amount).toLocaleString()}`;
  const remaining = part.expires_at
    ? new Date(part.expires_at).getTime() - now
    : null;
  const expired = remaining !== null && remaining <= 0;

  if (paid) {
    return (
      <div className="flex max-w-[85%] flex-col items-start gap-1 self-start rounded-2xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
        <p className="text-sm font-medium text-green-700 dark:text-green-300">
          ✅ Payment received
        </p>
        <p className="text-xs text-green-700/80 dark:text-green-300/80">
          Your order is confirmed. We&apos;ll be in touch.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[300px] flex-col gap-3 self-start rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Landmark size={16} className="text-[#0866FF]" />
        Pay by bank transfer
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-muted-foreground">Bank</p>
        <p className="text-sm font-medium">{part.bank_name}</p>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-muted-foreground">Account number</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-semibold tracking-wide">
            {part.account_number}
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
        {part.account_name && (
          <p className="text-xs text-muted-foreground">{part.account_name}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Transfer exactly <span className="font-semibold text-foreground">{naira}</span> to this
        account. Your order will be confirmed automatically.
      </p>

      {part.payment_reference && (
        <p className="text-[11px] text-muted-foreground">
          Ref: <span className="font-mono">{part.payment_reference}</span>
        </p>
      )}

      {expired ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          This account has expired — tap Pay Now again for fresh details.
        </p>
      ) : (
        remaining !== null && (
          <p className="text-[11px] text-muted-foreground">
            Account expires in{" "}
            <span className="font-medium text-foreground">{formatCountdown(remaining)}</span>
          </p>
        )
      )}
    </div>
  );
}
