"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp } from "lucide-react";
import type { Business } from "@/lib/auth";
import { playReceiveSound, playSendSound } from "@/lib/sound/chat-sounds";
import {
  AssistantToolPart,
  WRITE_TOOL_NAMES,
  toolNameOf,
  type ToolPart,
} from "./assistant-message";

const SUGGESTIONS = [
  "How much did I sell this week?",
  "Show me my pending orders",
  "What's my top product?",
  "How many customers do I have?",
];

function messageText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n");
}

function toolParts(message: UIMessage): ToolPart[] {
  if (!Array.isArray(message.parts)) return [];
  return message.parts.filter(
    (p) => p.type === "dynamic-tool" || p.type.startsWith("tool-")
  ) as unknown as ToolPart[];
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 self-start rounded-2xl bg-gray-100 dark:bg-zinc-800 px-3 py-2.5" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export function AssistantBar({ business }: { business: Business }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef(false);
  const lastAssistantIdRef = useRef<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/dashboard/assistant" }),
    []
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    onError: (e) => setSendError(e.message),
  });

  const busy = status === "streaming" || status === "submitted";
  const expanded = messages.length > 0;
  const canSubmit = input.trim().length > 0 && !busy;

  // Refresh dashboard stats after a successful write tool.
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of toolParts(m)) {
        const name = toolNameOf(part);
        if (
          name &&
          WRITE_TOOL_NAMES.includes(name) &&
          part.state === "output-available" &&
          (part.output as { ok?: unknown } | null)?.ok === true
        ) {
          router.refresh();
          return;
        }
      }
    }
  }, [messages, router]);

  useEffect(() => {
    if (error) setSendError(error.message);
  }, [error]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setSendError(null);
    setInput("");
    sentRef.current = true;
    playSendSound();
    sendMessage({ text });
  }

  // Chime when a reply to this session's messages finishes arriving.
  useEffect(() => {
    if (!sentRef.current || busy) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last && last.id !== lastAssistantIdRef.current) {
      lastAssistantIdRef.current = last.id;
      playReceiveSound();
    }
  }, [messages, busy]);

  function onChipClick(suggestion: string) {
    setInput(suggestion);
    inputRef.current?.focus();
  }

  function onClear() {
    setMessages([]);
    setInput("");
    setSendError(null);
  }

  return (
    <div>
      {expanded && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-[#1a1a1a] dark:text-zinc-100 hover:underline"
            aria-label="Clear assistant conversation"
          >
            Clear
          </button>
        </div>
      )}

      {expanded && (
        <div className="max-h-[400px] overflow-y-auto pb-3 md:max-h-none md:overflow-visible">
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-2">
                {m.role === "user" ? (
                  <div className="animate-in slide-in-from-bottom-2 self-end rounded-2xl bg-[#006DFF] px-3 py-2 text-sm text-white duration-300">
                    {messageText(m)}
                  </div>
                ) : (
                  <>
                    {messageText(m).trim() && (
                      <div className="animate-in slide-in-from-bottom-2 self-start rounded-2xl bg-gray-100 dark:bg-zinc-800 px-3 py-2 text-sm text-[#1a1a1a] dark:text-zinc-100 duration-300">
                        <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {messageText(m)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {toolParts(m).map((part, i) => {
                      const name = toolNameOf(part);
                      if (!name) return null;
                      return (
                        <div
                          key={`${m.id}-tool-${i}`}
                          className="animate-in slide-in-from-bottom-2 self-start duration-300 md:max-w-[85%]"
                        >
                          <AssistantToolPart part={part} />
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ))}
            {busy && <TypingDots />}
            {sendError && (
              <p className="self-start text-sm text-red-600">{sendError}</p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-800 px-2 py-1 transition-all duration-300">
        <form onSubmit={onSubmit} className="flex min-h-[44px] items-center gap-2">
          <Image
            src="/AI.png"
            alt="Tagly assistant"
            width={44}
            height={44}
            className="ml-3 h-[22px] w-[22px] shrink-0 rounded-md"
            aria-hidden
          />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={expanded ? "Follow up…" : "Ask me anything about your shop…"}
            aria-label={`Ask the ${business.name} assistant`}
            className="flex-1 border-0 bg-transparent text-base text-zinc-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Send assistant message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#006DFF] transition-colors hover:bg-[#005DD9] disabled:cursor-not-allowed disabled:bg-gray-200"
          >
            <ArrowUp
              size={18}
              className={canSubmit ? "text-white" : "text-gray-400"}
              aria-hidden
            />
          </button>
        </form>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChipClick(s)}
            className="rounded-full bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 text-sm text-[#1a1a1a] dark:text-zinc-100 transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
