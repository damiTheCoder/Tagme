import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signConversationToken } from "@/lib/chat/token";

const MAX_IDENTITY_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

// In-memory per-IP throttle. Resets on restart and is per-instance —
// fine for now, revisit with a persistent store if abused at scale.
const hits = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_IDENTITY_PER_HOUR) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return true;
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function cleanPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^+\d\s]/g, "").trim();
  if (cleaned.length < 7 || cleaned.length > 20) return null;
  if (!/^\+?[\d\s]+$/.test(cleaned)) return null;
  if (!/\d/.test(cleaned)) return null;
  return cleaned;
}

/** Capture a visitor's name + WhatsApp number before chat starts. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { slug, name, phone } = (body ?? {}) as {
    slug?: unknown;
    name?: unknown;
    phone?: unknown;
  };

  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json(
      { ok: false, error: "slug is required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("slug", slug.trim())
    .maybeSingle();

  if (!business) {
    return NextResponse.json(
      { ok: false, error: "Business not found." },
      { status: 404 }
    );
  }

  const cleanName =
    typeof name === "string" && name.trim().length >= 1 && name.trim().length <= 80
      ? name.trim()
      : null;
  if (!cleanName) {
    return NextResponse.json(
      { ok: false, error: "Please enter your name (1–80 characters)." },
      { status: 400 }
    );
  }

  const cleanPhoneNumber = cleanPhone(phone);
  if (!cleanPhoneNumber) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please enter a valid WhatsApp number (7–20 digits).",
      },
      { status: 400 }
    );
  }

  if (!checkRateLimit(clientIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      business_id: business.id,
      name: cleanName,
      phone: cleanPhoneNumber,
    })
    .select("id")
    .single();
  if (customerError || !customer) {
    return NextResponse.json(
      { ok: false, error: "Could not start chatting. Try again." },
      { status: 500 }
    );
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      business_id: business.id,
      customer_id: customer.id,
      status: "active",
    })
    .select("id")
    .single();
  if (conversationError || !conversation) {
    return NextResponse.json(
      { ok: false, error: "Could not start chatting. Try again." },
      { status: 500 }
    );
  }

  const firstName = cleanName.split(/\s+/)[0];
  const greeting = `Hi ${firstName} 👋 welcome to ${business.name}. What can I get for you today?`;
  const now = new Date().toISOString();
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: greeting,
  });
  await supabase
    .from("conversations")
    .update({ last_message_at: now })
    .eq("id", conversation.id);

  return NextResponse.json({
    ok: true,
    token: signConversationToken(conversation.id),
    conversationId: conversation.id,
    greeting,
  });
}
