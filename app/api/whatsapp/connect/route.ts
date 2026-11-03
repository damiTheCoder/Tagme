import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ ok: false, error: "No business." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const { code, phoneNumberId, accessToken } = (body ?? {}) as {
    code?: unknown; phoneNumberId?: unknown; accessToken?: unknown;
  };

  const supabase = createAdminClient();

  // Manual credential save path.
  if (typeof accessToken === "string" && accessToken) {
    await supabase.from("businesses").update({
      whatsapp_access_token: accessToken,
      ...(typeof phoneNumberId === "string" && phoneNumberId ? { whatsapp_phone_number_id: phoneNumberId } : {}),
    }).eq("id", business.id);
    return NextResponse.json({ ok: true });
  }

  // Embedded Signup code exchange path.
  if (typeof code === "string" && code) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      return NextResponse.json({ ok: false, error: "Meta app not configured." }, { status: 500 });
    }
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`;
    const res = await fetch(tokenUrl);
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return NextResponse.json({ ok: false, error: data?.error?.message || "Token exchange failed." }, { status: 400 });
    }
    await supabase.from("businesses").update({
      whatsapp_access_token: data.access_token,
      ...(typeof phoneNumberId === "string" && phoneNumberId ? { whatsapp_phone_number_id: phoneNumberId } : {}),
    }).eq("id", business.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "code or accessToken required." }, { status: 400 });
}
