"use client";

import { useEffect, useRef } from "react";
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
}: {
  messages: UIMessage[];
  busy: boolean;
  onSelectProduct: (product: CarouselProduct) => void;
  initialProducts?: CarouselProduct[];
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
          if (!text && !catalog) return null;
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
