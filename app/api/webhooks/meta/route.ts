import { NextResponse, after } from "next/server";
import { generateText } from "ai";
import { chatModel } from "@/lib/ai/model";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt } from "@/lib/chat/prompt";

const HARDCODED_BUSINESS_ID = "b04abb96-739a-4983-beda-e9755b7a7834";

async function sendWhatsAppMessage(to: string, text: string) {
  const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode")?.trim();
  const token = searchParams.get("hub.verify_token")?.trim();
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN?.trim()) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ ok: false, error: "Verification failed." }, { status: 403 });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true });
  }

  const entry = (body as any)?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages;

  if ((body as any)?.object !== "whatsapp_business_account" || !Array.isArray(messages) || !messages.length) {
    return NextResponse.json({ received: true });
  }

  const from = messages[0]?.from as string;
  const text = messages[0]?.text?.body as string;
  if (!from || !text) {
    return NextResponse.json({ received: true });
  }

  after(async () => {
    try {
      const supabase = createAdminClient();
      const { data: business } = await supabase
        .from("businesses")
        .select("id, name, slug, description, hours, policies, currency, suspended_at, deleted_at")
        .eq("id", HARDCODED_BUSINESS_ID)
        .maybeSingle();

      if (!business) {
        await sendWhatsAppMessage(from, "Sorry, something went wrong.");
        return;
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

      await sendWhatsAppMessage(from, (reply ?? "").trim() || "Got it, thanks!");
    } catch (e) {
      console.error("[meta webhook] error:", e instanceof Error ? e.message : e);
    }
  });

  return NextResponse.json({ received: true });
}