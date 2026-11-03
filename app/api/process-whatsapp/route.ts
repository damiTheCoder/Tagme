import { NextResponse } from "next/server";
import { generateText } from "ai";
import { chatModel } from "@/lib/ai/model";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt } from "@/lib/chat/prompt";

const HARDCODED_BUSINESS_ID = "b04abb96-739a-4983-beda-e9755b7a7834";

async function sendWhatsAppMessage(to: string, text: string, phoneNumberId?: string | null, token?: string | null) {
  const pid = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const tok = token || process.env.WHATSAPP_TOKEN;
  const url = `https://graph.facebook.com/v18.0/${pid}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

export async function POST(req: Request) {
  console.log("[process-whatsapp] POST hit", new Date().toISOString());
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const { from, text, phoneNumberId } = (body ?? {}) as { from?: unknown; text?: unknown; phoneNumberId?: unknown };
  if (typeof from !== "string" || !from || typeof text !== "string" || !text) {
    return NextResponse.json({ ok: false, error: "from and text required." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    let business: any = null;
    if (typeof phoneNumberId === "string" && phoneNumberId) {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, description, hours, policies, currency, suspended_at, deleted_at, whatsapp_phone_number_id, whatsapp_access_token")
        .eq("whatsapp_phone_number_id", phoneNumberId)
        .maybeSingle();
      business = data;
    }
    if (!business) {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, description, hours, policies, currency, suspended_at, deleted_at, whatsapp_phone_number_id, whatsapp_access_token")
        .eq("id", HARDCODED_BUSINESS_ID)
        .maybeSingle();
      business = data;
    }
    if (!business) {
      await sendWhatsAppMessage(from, "Sorry, something went wrong.");
      return NextResponse.json({ ok: true });
    }

    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, in_stock, stock_count, description, details")
      .eq("business_id", business.id)
      .limit(100);

    const { text: reply } = await generateText({
      model: chatModel(),
      system: buildSystemPrompt(business, products ?? []),
      messages: [{ role: "user", content: text }],
    });

    await sendWhatsAppMessage(from, (reply ?? "").trim() || "Got it, thanks!", business.whatsapp_phone_number_id, business.whatsapp_access_token);
  } catch (e) {
    console.error("[process-whatsapp] error:", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ ok: true });
}