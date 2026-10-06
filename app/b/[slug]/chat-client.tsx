"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { IdentityForm } from "./identity-form";

type HistoryRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

function toUIMessage(m: HistoryRow): UIMessage {
  return {
    id: m.id,
    role: m.role === "user" ? "user" : m.role === "system" ? "system" : "assistant",
    parts: [{ type: "text" as const, text: m.content }],
  };
}

export function ChatClient({
  businessSlug,
  businessName,
}: {
  businessSlug: string;
  businessName: string;
}) {
  const storageKey = `tagly-chat:${businessSlug}`;
  const tokenRef = useRef<string | null>(null);
  const lastTsRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [phase, setPhase] = useState<"loading" | "identify" | "chat">("loading");
  const [sendError, setSendError] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          businessSlug,
          conversationToken: tokenRef.current,
        }),
        fetch: async (url, init) => {
          const res = await fetch(url, init);
          const next = res.headers.get("X-Conversation-Token");
          if (next) {
            tokenRef.current = next;
            try {
              localStorage.setItem(storageKey, next);
            } catch {
              // Storage unavailable — conversation still works for this session.
            }
          }
          return res;
        },
      }),
    [businessSlug, storageKey]
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    onError: (e) => setSendError(e.message),
  });

  const loadHistory = useCallback(
    async (stored: string): Promise<boolean> => {
      try {
        const res = await fetch(
          `/api/chat/history?slug=${encodeURIComponent(businessSlug)}&token=${encodeURIComponent(stored)}`
        );
        const data = await res.json();
        if (!res.ok || !data.ok) return false;
        const rows = (data.messages as HistoryRow[]).filter((m) => m.content);
        for (const m of rows) {
          seenIdsRef.current.add(m.id);
          if (
            m.created_at &&
            (!lastTsRef.current || m.created_at > lastTsRef.current)
          ) {
            lastTsRef.current = m.created_at;
          }
        }
        setMessages(rows.map(toUIMessage));
        return true;
      } catch {
        // Offline or unreachable.
        return false;
      }
    },
    [businessSlug, setMessages]
  );

  // On mount: token → straight to chat; otherwise show the identity form.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(storageKey);
      } catch {
        stored = null;
      }
      if (!stored) {
        if (!cancelled) setPhase("identify");
        return;
      }
      tokenRef.current = stored;
      const ok = await loadHistory(stored);
      if (cancelled) return;
      if (ok) {
        setPhase("chat");
      } else {
        tokenRef.current = null;
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
        setPhase("identify");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [businessSlug, storageKey, loadHistory]);

  // Poll for owner notifications (system messages) every 3 seconds.
  // Only the delta is fetched; only unseen system messages are appended,
  // so locally-streamed user/assistant messages are never duplicated.
  useEffect(() => {
    if (phase !== "chat") return;
    const interval = setInterval(async () => {
      const token = tokenRef.current;
      if (!token || document.hidden) return;
      try {
        const params = new URLSearchParams({
          slug: businessSlug,
          token,
          ...(lastTsRef.current ? { since: lastTsRef.current } : {}),
        });
        const res = await fetch(`/api/chat/history?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || !data.ok) return;
        const additions: UIMessage[] = [];
        for (const m of data.messages as HistoryRow[]) {
          if (
            m.created_at &&
            (!lastTsRef.current || m.created_at > lastTsRef.current)
          ) {
            lastTsRef.current = m.created_at;
          }
          if (
            m.role === "system" &&
            m.content &&
            !seenIdsRef.current.has(m.id)
          ) {
            seenIdsRef.current.add(m.id);
            additions.push(toUIMessage(m));
          }
        }
        if (additions.length > 0) {
          setMessages((prev) => [...prev, ...additions]);
        }
      } catch {
        // Transient failure — the next tick retries.
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, businessSlug, setMessages]);

  const busy = status === "streaming" || status === "submitted";

  function handleSend(text: string) {
    setSendError(null);
    sendMessage({ text });
  }

  async function handleIdentified(token: string) {
    tokenRef.current = token;
    try {
      localStorage.setItem(storageKey, token);
    } catch {
      // ignore
    }
    // Same rendering path as a returning visitor: load persisted history,
    // which starts with the server-seeded greeting.
    await loadHistory(token);
    setPhase("chat");
  }

  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Opening {businessName}…
        </p>
      </div>
    );
  }

  if (phase === "identify") {
    return (
      <IdentityForm
        businessName={businessName}
        businessSlug={businessSlug}
        onDone={handleIdentified}
      />
    );
  }

  return (
    <>
      <ChatMessages messages={messages} busy={busy} />
      {(sendError || error) && (
        <p className="px-4 pt-2 text-xs text-red-600">
          {sendError ?? error?.message ?? "Something went wrong. Try again."}
        </p>
      )}
      <ChatInput onSend={handleSend} disabled={busy} />
    </>
  );
}
