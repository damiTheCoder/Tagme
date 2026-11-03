import { NextResponse } from "next/server";

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
  console.log("[meta webhook] POST hit", new Date().toISOString());
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
  let text = messages[0]?.text?.body as string;
  const msgType = messages[0]?.type;
  if (!text && msgType === "interactive") {
    const inter = messages[0]?.interactive;
    const replyId = inter?.button_reply?.id ?? inter?.list_reply?.id;
    if (replyId) text = `[User clicked: ${replyId}]`;
  }
  const phoneNumberId = value?.metadata?.phone_number_id as string | undefined;
  if (!from || !text) {
    return NextResponse.json({ received: true });
  }

  const processUrl = new URL("/api/process-whatsapp", req.url).toString();
  void fetch(processUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, text, phoneNumberId }),
  }).catch((e) => {
    console.error("[meta webhook] process fetch failed:", e instanceof Error ? e.message : e);
  });

  return NextResponse.json({ received: true });
}