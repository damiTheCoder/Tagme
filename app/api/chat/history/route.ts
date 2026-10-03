import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyConversationToken } from "@/lib/chat/token";

/** Load persisted history for a visitor token. No auth required. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") ?? "";
  const token = searchParams.get("token") ?? "";
  const since = searchParams.get("since") ?? "";

  if (!slug.trim() || !token) {
    return NextResponse.json(
      { ok: false, error: "slug and token are required." },
      { status: 400 }
    );
  }

  const conversationId = verifyConversationToken(token);
  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, businesses!inner(slug)")
    .eq("id", conversationId)
    .maybeSingle();

  const convBusiness = conv?.businesses as { slug: string } | { slug: string }[] | null;
  const convSlug = Array.isArray(convBusiness)
    ? convBusiness[0]?.slug
    : convBusiness?.slug;
  if (!conv || convSlug !== slug.trim()) {
    return NextResponse.json(
      { ok: false, error: "Conversation not found." },
      { status: 404 }
    );
  }

  let query = supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .neq("role", "system")
    .order("created_at", { ascending: true })
    .limit(200);

  // Delta mode for realtime polling: only messages after `since`.
  // System messages are always included so owner notifications arrive
  // even if their timestamp equals the cursor.
  if (since) {
    const d = new Date(since);
    if (!isNaN(d.getTime())) {
      query = supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .or(`created_at.gt.${d.toISOString()},role.eq.system`)
        .order("created_at", { ascending: true })
        .limit(200);
    }
  }

  const { data: messages } = await query;

  return NextResponse.json({ ok: true, messages: messages ?? [] });
}
