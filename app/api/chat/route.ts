import { NextResponse } from "next/server";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { chatModel } from "@/lib/ai/model";
import { createAdminClient } from "@/lib/supabase/admin";
import { signConversationToken, verifyConversationToken } from "@/lib/chat/token";
import { buildSystemPrompt } from "@/lib/chat/prompt";
import { createTools } from "@/lib/chat/tools";

const MAX_MESSAGES = 50;
const RATE_LIMIT_PER_HOUR = 30;

function extractText(message: UIMessage | undefined): string {
  if (!message || !Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n")
    .trim();
}

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

  const { messages, businessSlug, conversationToken } = (body ?? {}) as {
    messages?: unknown;
    businessSlug?: unknown;
    conversationToken?: unknown;
  };

  if (typeof businessSlug !== "string" || !businessSlug.trim()) {
    return NextResponse.json(
      { ok: false, error: "businessSlug is required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, description, hours, policies, currency")
    .eq("slug", businessSlug.trim())
    .maybeSingle();

  if (!business) {
    return NextResponse.json(
      { ok: false, error: "Business not found." },
      { status: 404 }
    );
  }

  // Resolve or create the conversation.
  let conversationId: string | null = null;
  let customerId: string | null = null;
  let newToken: string | null = null;

  if (typeof conversationToken === "string" && conversationToken) {
    const verifiedId = verifyConversationToken(conversationToken);
    if (verifiedId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, business_id, customer_id")
        .eq("id", verifiedId)
        .maybeSingle();
      if (conv && conv.business_id === business.id) {
        conversationId = conv.id;
        customerId = conv.customer_id;
      }
    }
  }

  if (!conversationId) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({ business_id: business.id })
      .select("id")
      .single();
    if (customerError || !customer) {
      return NextResponse.json(
        { ok: false, error: "Could not start conversation." },
        { status: 500 }
      );
    }
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ business_id: business.id, customer_id: customer.id })
      .select("id")
      .single();
    if (convError || !conv) {
      return NextResponse.json(
        { ok: false, error: "Could not start conversation." },
        { status: 500 }
      );
    }
    const freshConversationId: string = conv.id;
    conversationId = freshConversationId;
    customerId = customer.id;
    newToken = signConversationToken(freshConversationId);
  }

  // Older conversations may have no customer (nullable column) — backfill one.
  if (!customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .insert({ business_id: business.id })
      .select("id")
      .single();
    if (customer) {
      customerId = customer.id;
      await supabase
        .from("conversations")
        .update({ customer_id: customer.id })
        .eq("id", conversationId);
    }
  }

  // Rate limit: max 30 messages per conversation per hour.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "You've sent a lot of messages in the last hour. Please take a short break and try again soon.",
      },
      { status: 429 }
    );
  }

  const incoming = Array.isArray(messages) ? (messages as UIMessage[]) : [];
  const capped = incoming.slice(-MAX_MESSAGES);

  // The customer timeline can contain `system` messages (owner
  // approve/decline notifications). The model provider rejects system
  // roles in the messages array, and they carry no conversational context
  // the model needs, so drop them before conversion.
  const modelInput = capped.filter((m) => m?.role !== "system");

  // Persist the latest user message.
  const lastUser = [...capped].reverse().find((m) => m?.role === "user");
  const userText = extractText(lastUser);
  const now = new Date().toISOString();
  if (userText) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userText.slice(0, 8000),
    });
    await supabase
      .from("conversations")
      .update({ last_message_at: now })
      .eq("id", conversationId);
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, in_stock")
    .eq("business_id", business.id)
    .limit(100);

  let customerName: string | null = null;
  let customerPhone: string | null = null;
  if (customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", customerId)
      .maybeSingle();
    if (customer?.name?.trim()) customerName = customer.name.trim();
    if (customer?.phone?.trim()) customerPhone = customer.phone.trim();
  }

  const resolvedConversationId = conversationId;
  const result = streamText({
    model: chatModel(),
    system: buildSystemPrompt(business, products ?? [], customerName),
    messages: await convertToModelMessages(modelInput),
    tools: createTools({
      business,
      conversationId: resolvedConversationId,
      customerId: customerId ?? "",
      customer: { name: customerName, phone: customerPhone },
    }),
    stopWhen: stepCountIs(5),
    onFinish: async ({ text }) => {
      if (text && text.trim()) {
        await supabase.from("messages").insert({
          conversation_id: resolvedConversationId,
          role: "assistant",
          content: text.slice(0, 8000),
        });
      }
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", resolvedConversationId);
    },
  });

  const headers: Record<string, string> = {};
  if (newToken) headers["X-Conversation-Token"] = newToken;
  return result.toUIMessageStreamResponse({ headers });
}
