"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp } from "lucide-react";
import { Pacifico } from "next/font/google";
import type { Business } from "@/lib/auth";
import { playReceiveSound, playSendSound } from "@/lib/sound/chat-sounds";
import {
  AssistantToolPart,
  WRITE_TOOL_NAMES,
  toolNameOf,
  type ToolPart,
} from "./assistant-message";

const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });

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

export function AssistantBar({
  business,
  showSuggestions = true,
  fullPage = false,
}: {
  business: Business;
  showSuggestions?: boolean;
  fullPage?: boolean;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // Typewriter placeholder: cycle through the example questions while the
  // bar is empty, so the suggestions live inside the input itself.
  const [typedPlaceholder, setTypedPlaceholder] = useState("");

  useEffect(() => {
    if (!showSuggestions || expanded || input) {
      setTypedPlaceholder("");
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setTypedPlaceholder(SUGGESTIONS[0]);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
      if (cancelled) return;
      const phrase = SUGGESTIONS[phraseIndex];

      if (!deleting) {
        charIndex += 1;
        setTypedPlaceholder(phrase.slice(0, charIndex));
        if (charIndex >= phrase.length) {
          deleting = true;
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 55);
      } else {
        charIndex -= 1;
        setTypedPlaceholder(phrase.slice(0, charIndex));
        if (charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % SUGGESTIONS.length;
          timer = setTimeout(tick, 350);
          return;
        }
        timer = setTimeout(tick, 25);
      }
    };

    timer = setTimeout(tick, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expanded, input, showSuggestions]);

  // Refresh the page's server data after a successful write tool.
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
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
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

  // Keep the latest reply in view inside the scroll container.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  function onClear() {
    setMessages([]);
    setInput("");
    setSendError(null);
  }

  const renderMessages = () => (
    <div className="flex flex-col gap-2">
      {messages.map((m) => (
        <div key={m.id} className="flex flex-col gap-2">
          {m.role === "user" ? (
            <div className="animate-in slide-in-from-bottom-2 self-end rounded-2xl bg-[#0866FF] px-3.5 py-2 text-sm text-white duration-300">
              {messageText(m)}
            </div>
          ) : (
            <>
              {messageText(m).trim() && (
                <div className="animate-in slide-in-from-bottom-2 self-start rounded-2xl bg-gray-100 dark:bg-zinc-800 px-3.5 py-2 text-sm text-[#1a1a1a] dark:text-zinc-100 duration-300">
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
  );

  const renderInputBar = (placeholder: string) => (
    <div className="rounded-2xl bg-gray-100 dark:bg-zinc-800 px-2 py-1 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300">
      <form onSubmit={onSubmit} className="flex min-h-[44px] items-center gap-2">
        <Image
          src="/AI.jpeg"
          alt="Tagly assistant"
          width={44}
          height={44}
          className="ml-3 h-[22px] w-[22px] shrink-0 rounded-lg object-contain"
          aria-hidden
        />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label={`Ask the ${business.name} assistant`}
          className="flex-1 border-0 bg-transparent text-base text-zinc-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Send assistant message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#0866FF] via-[#4C8DFF] to-[#00C6FF] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-none disabled:bg-gray-200"
        >
          <ArrowUp
            size={18}
            className={canSubmit ? "text-white" : "text-gray-400"}
            aria-hidden
          />
        </button>
      </form>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex flex-1 flex-col h-full min-h-[calc(100dvh-10rem)] max-w-3xl mx-auto w-full">
        {!expanded ? (
          <div className="my-auto flex flex-col items-center gap-6 py-8 text-center transition-all duration-300">
            <h1 className={`${pacifico.className} text-3xl tracking-tight text-[#0c4a6e] dark:text-[#a8fe65]`}>
              hello
            </h1>
            <div className="w-full max-w-2xl mt-2">
              {renderInputBar(typedPlaceholder || "Ask me anything about your shop…")}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col min-h-0">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/AI.jpeg"
                  alt="Tagly assistant"
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-lg object-contain"
                />
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-gray-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:underline"
                aria-label="Clear assistant conversation"
              >
                Clear chat
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto pb-4 no-scrollbar-desktop"
            >
              {renderMessages()}
            </div>

            <div className="mt-auto pt-2">
              {renderInputBar("Follow up…")}
            </div>
          </div>
        )}
      </div>
    );
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
        <div
          ref={scrollRef}
          className="max-h-[400px] overflow-y-auto pb-3 no-scrollbar-desktop md:max-h-[420px]"
        >
          {renderMessages()}
        </div>
      )}

      {renderInputBar(expanded ? "Follow up…" : typedPlaceholder || "Ask me anything about your shop…")}
    </div>
  );
}
