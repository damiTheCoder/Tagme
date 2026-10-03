"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

export function messageText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n");
}

export function ChatMessages({
  messages,
  busy,
}: {
  messages: UIMessage[];
  busy: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && !busy && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Say hello to start your order 👋
        </p>
      )}
      <div className="flex flex-col gap-2">
        {messages.map((m) => {
          const text = messageText(m);
          if (!text) return null;
          if (m.role === "system") {
            return (
              <div
                key={m.id}
                className="self-center rounded-full bg-neutral-100 px-3 py-1 text-center text-xs text-muted-foreground"
              >
                {text}
              </div>
            );
          }
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                isUser
                  ? "self-end bg-[#a8fe65] text-[#1a1a1a]"
                  : "self-start bg-neutral-100 text-neutral-900"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{text}</p>
            </div>
          );
        })}
        {busy && (
          <div className="flex items-center gap-1 self-start rounded-2xl bg-neutral-100 px-4 py-3">
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
