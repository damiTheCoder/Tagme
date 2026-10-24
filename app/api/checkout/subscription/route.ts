import { NextResponse } from "next/server";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { createSubscriptionCheckout } from "@/lib/bachs/client";

function appUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin
  );
}

/** Start the vendor's ₦3,000/month subscription checkout. */
export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    if (!business) {
      return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }
    const user = await getCurrentUser();
    const email = user?.email;
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "No email on this account." },
        { status: 400 }
      );
    }
    const base = appUrl(req);
    const url = await createSubscriptionCheckout(
      business.id,
      email,
      `${base}/dashboard/billing?success=1`,
      `${base}/dashboard/billing?canceled=1`
    );
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error(
      "[checkout subscription] failed",
      err instanceof Error ? err.message : err,
      err instanceof Error ? err.stack : undefined
    );
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not start checkout." },
      { status: 500 }
    );
  }
}
