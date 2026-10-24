import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const SANDBOX_BASE = "https://sandbox-api.bachs.io";
const LIVE_BASE = "https://api.bachs.io";

// Bachs rejects timestamps older than this (mirrors their 300s clock window).
const MAX_TIMESTAMP_SKEW_S = 300;

function secretKey(): string {
  const key = process.env.BACHS_SECRET_KEY;
  if (!key) {
    throw new Error(
      "BACHS_SECRET_KEY is not set. Add it to .env.local (sk_sandbox_... for testing)."
    );
  }
  return key;
}

function baseUrl(): string {
  if (process.env.BACHS_BASE_URL) return process.env.BACHS_BASE_URL;
  return secretKey().startsWith("sk_live_") ? LIVE_BASE : SANDBOX_BASE;
}

function subscriptionProductId(): string {
  const id = process.env.BACHS_SUBSCRIPTION_PRODUCT_ID;
  if (!id) {
    throw new Error(
      "BACHS_SUBSCRIPTION_PRODUCT_ID is not set. Create a recurring ₦3,000/month product in the Bachs dashboard and add its ID to .env.local."
    );
  }
  return id;
}

function toDecimalString(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid checkout amount: ${String(amount)}`);
  }
  return n.toFixed(2);
}

async function bachsFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${baseUrl()}${path}`;
  // Never log the key or full body (PII) — keys and shape only.
  console.log("[bachs] request", { url, method: "POST", bodyKeys: Object.keys(body) });
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[bachs] fetch threw", err instanceof Error ? err.message : err);
    throw err;
  }
  if (!res.ok) {
    const bodyText = await res.clone().text().catch(() => "<unreadable body>");
    console.error("[bachs] API error", {
      status: res.status,
      statusText: res.statusText,
      body: bodyText.slice(0, 2000),
    });
    throw new Error(`Bachs API ${res.status}: ${bodyText.slice(0, 500)}`);
  }
  const data = (await res.json().catch(() => null)) as T | null;
  if (!data) throw new Error("Bachs returned an empty response.");
  return data;
}

type CheckoutSessionResponse = {
  checkout_id: string;
  checkout_url: string;
  status?: string;
};

/**
 * Starts the ₦3,000/month vendor subscription. Bachs turns the session
 * into a subscription because the product carries a billing cycle; the
 * business is linked back via metadata on the webhook.
 */
export async function createSubscriptionCheckout(
  businessId: string,
  email: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await bachsFetch<CheckoutSessionResponse>("/v1/checkout-sessions", {
    billing: "subscription",
    product_cart: [{ product_id: subscriptionProductId(), quantity: 1 }],
    customer: { email },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { kind: "subscription", business_id: businessId },
  });
  if (!session.checkout_url) throw new Error("Bachs did not return a checkout URL.");
  return session.checkout_url;
}

/**
 * Starts a one-time customer payment for an order. Uses raw pricing since
 * order totals are computed at checkout time. The order is identified by
 * `reference` and confirmed via webhook — never via the redirect alone.
 */
export async function createCustomerCheckout(
  orderId: string,
  amount: string,
  email: string,
  businessName: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await bachsFetch<CheckoutSessionResponse>("/v1/checkout-sessions", {
    billing: "one_time",
    pricing: { currency: "NGN", amount: toDecimalString(amount) },
    customer: { email },
    success_url: successUrl,
    cancel_url: cancelUrl,
    reference: orderId,
    metadata: { kind: "order_payment", order_id: orderId, business_name: businessName },
  });
  if (!session.checkout_url) throw new Error("Bachs did not return a checkout URL.");
  return session.checkout_url;
}

/**
 * Verifies a Bachs webhook signature. Bachs signs `${timestamp}.${rawBody}`
 * with HMAC-SHA256 using the endpoint's signing secret. Rejects stale
 * timestamps to close the replay window.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    const secret = process.env.BACHS_WEBHOOK_SECRET;
    if (!secret || !signature || !timestamp) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    if (Math.abs(Date.now() / 1000 - ts) > MAX_TIMESTAMP_SKEW_S) return false;

    const expectedHex = createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const sig = signature.trim().toLowerCase();
    const candidates = [
      expectedHex,
      Buffer.from(expectedHex, "hex").toString("base64"),
      Buffer.from(expectedHex, "hex").toString("base64url"),
    ];
    const sigBuf = Buffer.from(sig, "utf8");
    return candidates.some((c) => {
      const buf = Buffer.from(c.toLowerCase(), "utf8");
      return sigBuf.length === buf.length && timingSafeEqual(sigBuf, buf);
    });
  } catch {
    return false;
  }
}
