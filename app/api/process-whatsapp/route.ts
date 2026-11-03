import { NextResponse } from "next/server";
import { generateText } from "ai";
import { chatModel } from "@/lib/ai/model";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt } from "@/lib/chat/prompt";
import { createTools } from "@/lib/chat/tools";
import { sendWhatsAppButtons, sendWhatsAppList } from "@/lib/whatsapp/send";

const HARDCODED_BUSINESS_ID = "b04abb96-739a-4983-beda-e9755b7a7834";

export async function POST(req: Request) {
  console.log("[process-whatsapp] POST hit", new Date().toISOString());
  let body: unknown;
  try { body = await req.json(); } catch {
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
      await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: from, type: "text", text: { body: "Sorry, something went wrong." } }),
      });
      return NextResponse.json({ ok: true });
    }

    const pid = business.whatsapp_phone_number_id;
    const tok = business.whatsapp_access_token;

    // Handle interactive reply clicks.
    const clickMatch = text.match(/\[User clicked: (.+)\]/);
    const clicked = clickMatch?.[1]?.trim();

    if (clicked?.startsWith("select_product_")) {
      const productId = clicked.replace("select_product_", "");
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("id", productId)
        .maybeSingle();
      const name = product?.name ?? "this item";
      await sendWhatsAppButtons(from, `How many ${name} would you like?`, [
        { id: "qty_1", title: "1" },
        { id: "qty_2", title: "2" },
        { id: "qty_custom", title: "Custom" },
      ], pid, tok);
      return NextResponse.json({ ok: true });
    }

    if (clicked === "qty_1" || clicked === "qty_2") {
      const qty = clicked === "qty_1" ? 1 : 2;
      await sendWhatsAppButtons(from, `Order created for ${qty} item(s). Proceed?`, [
        { id: "pay_now", title: "Pay Now" },
        { id: "cancel", title: "Cancel" },
      ], pid, tok);
      return NextResponse.json({ ok: true });
    }

    if (clicked === "qty_custom") {
      await fetch(`https://graph.facebook.com/v18.0/${pid}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: from, type: "text", text: { body: "Reply with the quantity you'd like." } }),
      });
      return NextResponse.json({ ok: true });
    }

    if (clicked === "pay_now") {
      await fetch(`https://graph.facebook.com/v18.0/${pid}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: from, type: "text", text: { body: "Payment link coming soon. Thank you!" } }),
      });
      return NextResponse.json({ ok: true });
    }

    if (clicked === "cancel") {
      await fetch(`https://graph.facebook.com/v18.0/${pid}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: from, type: "text", text: { body: "Order cancelled." } }),
      });
      return NextResponse.json({ ok: true });
    }

    // AI flow.
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, in_stock, stock_count, description, details, public_id")
      .eq("business_id", business.id)
      .limit(100);

    const tools = createTools({
      business: { id: business.id, name: business.name, description: business.description, hours: business.hours, policies: business.policies, currency: business.currency },
      conversationId: "",
      customerId: "",
      customer: { name: null, phone: from },
    });

    const result = await generateText({
      model: chatModel(),
      system: buildSystemPrompt(business, products ?? []),
      messages: [{ role: "user", content: text }],
      tools,
    });

    const toolResults = (result as any).toolResults ?? [];
    const listTool = toolResults.find((t: any) => t?.output?.action === "render_product_list");
    if (listTool?.output?.items?.length) {
      const items = listTool.output.items.slice(0, 10);
      await sendWhatsAppList(
        from,
        listTool.output.title || "Choose a product",
        "View products",
        [{ title: "Products", rows: items.map((it: any) => ({ id: `select_product_${it.public_id || it.id}`, title: it.name, description: `${it.price} ${business.currency}` })) }],
        pid,
        tok
      );
      return NextResponse.json({ ok: true });
    }

    const reply = (result.text ?? "").trim() || "Got it, thanks!";
    await fetch(`https://graph.facebook.com/v18.0/${pid}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: from, type: "text", text: { body: reply } }),
    });
  } catch (e) {
    console.error("[process-whatsapp] error:", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ ok: true });
}
