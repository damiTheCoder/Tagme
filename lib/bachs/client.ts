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

/** Short random tag so repeat charges for the same order don't collide. */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

async function bachsRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${baseUrl()}${path}`;
  // Never log the key or full body (PII) — keys and shape only.
  console.log("[bachs] request", {
    url,
    method,
    bodyKeys: body ? Object.keys(body) : [],
  });
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
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

type BankTransferSessionResponse = {
  checkout_id: string;
  mode: string;
  status: string;
  amount: string;
  currency: string;
  reference: string;
  expires_at: string;
  created_at: string;
};

type ConfirmBankTransferResponse = {
  checkout_id: string;
  charge_id: string;
  status: string;
  payment_method: string;
  currency: string;
  amount: number;
  next_step: {
    type: string;
    bank_account: {
      account_name: string;
      account_number: string;
      bank_name: string;
      bank_code: string;
      expires_at: string;
      reference: string;
      payment_reference: string;
    } | null;
    expires_at: string;
  } | null;
};

export type BankTransferCharge = {
  chargeId: string;
  checkoutId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  expiresAt: string;
  amount: string;
  currency: string;
  reference: string;
  paymentReference: string;
};

/**
 * Starts a one-time customer payment for an order via NGN bank transfer.
 *
 * Bachs' headless bank-transfer flow has two steps:
 *   1. Create a `custom` ui_mode checkout session (no hosted page, so the
 *      buyer's `customer.email` is mandatory and must pass deliverability).
 *   2. Confirm it with `payment_method: "NGN_BANK_TRANSFER"`, which mints a
 *      reserved virtual account and returns the instructions.
 *
 * Note: `POST /v1/charges` is NOT usable here — it only charges saved
 * payment methods and rejects fresh bank-transfer charges.
 *
 * The returned account details are only available from this response; they
 * are NOT retrievable later via GET or re-confirm, so callers must persist
 * them (we store them on the order row).
 */
export async function createBankTransferCharge(params: {
  orderId: string;
  amount: string;
  email: string;
  customerName?: string;
  businessName: string;
}): Promise<BankTransferCharge> {
  const { orderId, amount, email, customerName, businessName } = params;

  const session = await bachsRequest<BankTransferSessionResponse>(
    "POST",
    "/v1/checkout-sessions",
    {
      billing: "one_time",
      ui_mode: "custom",
      pricing: { currency: "NGN", amount: toDecimalString(amount) },
      customer: { email, name: customerName || businessName },
      // Bachs enforces reference uniqueness per account. A repeat "Pay Now"
      // (e.g. after the reserved account expired) mints a fresh session, so
      // suffix a short random tag — the order id stays recoverable in
      // `metadata.order_id`, which is what the webhook actually reads.
      reference: `${orderId.slice(0, 32)}.${randomSuffix()}`,
      metadata: {
        kind: "order_payment",
        order_id: orderId,
        business_name: businessName,
      },
    }
  );

  const confirmed = await bachsRequest<ConfirmBankTransferResponse>(
    "POST",
    `/v1/checkout-sessions/${session.checkout_id}/confirm`,
    {
      currency: "NGN",
      payment_method: "NGN_BANK_TRANSFER",
    }
  );

  const account = confirmed.next_step?.bank_account;
  if (!account?.account_number || !account?.bank_name) {
    throw new Error("Bachs did not return bank account details for this charge.");
  }

  return {
    chargeId: confirmed.charge_id,
    checkoutId: confirmed.checkout_id,
    accountNumber: account.account_number,
    accountName: account.account_name,
    bankName: account.bank_name,
    bankCode: account.bank_code,
    expiresAt: account.expires_at || confirmed.next_step?.expires_at || "",
    amount: toDecimalString(amount),
    currency: confirmed.currency || "NGN",
    reference: account.reference,
    paymentReference: account.payment_reference,
  };
}

/** Fetch a charge's current payment status by charge id (for polling before webhooks land). */
export async function getChargeStatus(chargeId: string): Promise<string | null> {
  try {
    const res = await bachsRequest<{ status?: string; payment_status?: string }>(
      "GET",
      `/v1/payments/${chargeId}`
    );
    return res.payment_status ?? res.status ?? null;
  } catch {
    // Non-fatal: status polling is a best-effort supplement to the webhook.
    return null;
  }
}

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
  const session = await bachsRequest<CheckoutSessionResponse>(
    "POST",
    "/v1/checkout-sessions",
    {
      billing: "subscription",
      product_cart: [{ product_id: subscriptionProductId(), quantity: 1 }],
      customer: { email },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { kind: "subscription", business_id: businessId },
    }
  );
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
