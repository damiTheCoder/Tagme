import { NextResponse } from "next/server";

export async function GET() {
  return Response.json({ alive: true });
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
  const text = messages[0]?.text?.body as string;
  if (!from || !text) {
    return NextResponse.json({ received: true });
  }

  const processUrl = new URL("/api/process-whatsapp", req.url).toString();
  void fetch(processUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, text }),
  }).catch((e) => {
    console.error("[meta webhook] process fetch failed:", e instanceof Error ? e.message : e);
  });

  return NextResponse.json({ received: true });
}