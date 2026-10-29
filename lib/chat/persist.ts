import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PART_TOOLNAME,
  type InteractivePart,
} from "@/lib/chat/interactive";

type Supa = ReturnType<typeof createAdminClient>;

/**
 * Persistence helpers shared by every route that writes to the transcript:
 * the streaming chat route, the GUI-only interact route, and the webhook's
 * conclusion trigger.
 *
 * All writes are best-effort in the sense that they never throw to the
 * caller for non-critical work — but they DO log, because a message that
 * silently fails to persist leaves the customer staring at a stuck button.
 */

async function touch(supabase: Supa, conversationId: string): Promise<void> {
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}

/** Persist the customer's tap as a normal user message (for the transcript). */
export async function persistUserLine(
  supabase: Supa,
  conversationId: string,
  text: string
): Promise<void> {
  const content = text.trim().slice(0, 2000);
  if (!content) return;
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content,
  });
  if (error) console.error("[chat interact] user line persist failed:", error.message);
  await touch(supabase, conversationId);
}

/**
 * Persist a canned assistant line with NO interactive part (used by the
 * cancel step). The text is written by the backend, never by the model —
 * the model only ever speaks at the intro and the conclusion.
 */
export async function persistAssistantText(
  supabase: Supa,
  conversationId: string,
  text: string
): Promise<void> {
  const content = text.trim().slice(0, 2000);
  if (!content) return;
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content,
  });
  if (error) console.error("[chat interact] assistant text persist failed:", error.message);
  await touch(supabase, conversationId);
}

/**
 * Persist an assistant message carrying one interactive part.
 *
 * Stored under `messages.parts` (migration 09) using the part's own type as
 * the toolName, so history reload takes exactly the same rendering path as a
 * live click — no separate schema, no migration.
 *
 * `content` holds an optional visible line of text; when there is none we
 * store a single space so NOT NULL and the client's truthiness filter both
 * stay happy while the bubble itself stays hidden.
 */
export async function persistInteractive(
  supabase: Supa,
  conversationId: string,
  part: InteractivePart,
  options: { text?: string; parts?: unknown[] } = {}
): Promise<{ ok: boolean; error?: string }> {
  const content = (options.text ?? "").trim();
  const parts = [
    ...(Array.isArray(options.parts) ? options.parts : []),
    { toolName: PART_TOOLNAME[part.type], output: part },
  ];

  const row: Record<string, unknown> = {
    conversation_id: conversationId,
    role: "assistant",
    content: content || " ",
    parts,
  };

  const { error } = await supabase.from("messages").insert(row);
  if (error) {
    // Pre-migration fallback: no `parts` column. Persist the visible text so
    // the conversation still reads sensibly even though buttons won't reload.
    if (/parts/i.test(error.message)) {
      const { parts: _dropped, ...textOnly } = row;
      const retry = await supabase.from("messages").insert(textOnly);
      if (retry.error) {
        console.error("[chat interact] persist failed:", retry.error.message);
        return { ok: false, error: retry.error.message };
      }
      await touch(supabase, conversationId);
      return { ok: true };
    }
    console.error("[chat interact] persist failed:", error.message);
    return { ok: false, error: error.message };
  }

  await touch(supabase, conversationId);
  return { ok: true };
}

/**
 * Look for an assistant row already carrying the AI's closing message for
 * this order. This is what makes Phase 3 safe to trigger from BOTH the
 * webhook (primary) and the customer's client (fallback) without ever
 * printing two "thanks for your order" messages.
 */
export async function findConclusion(
  supabase: Supa,
  conversationId: string,
  orderId: string
): Promise<{ id: string; content: string; parts: unknown } | null> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, content, parts")
    .eq("conversation_id", conversationId)
    .eq("role", "assistant")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error || !data) return null;

  for (const row of data) {
    const parts = row.parts;
    if (!Array.isArray(parts)) continue;
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const p = raw as { toolName?: unknown; output?: unknown };
      if (p.toolName !== "complete_order_flow") continue;
      const out = p.output as { order_id?: unknown } | null;
      if (out && out.order_id === orderId) {
        return { id: row.id, content: row.content, parts };
      }
    }
  }
  return null;
}
