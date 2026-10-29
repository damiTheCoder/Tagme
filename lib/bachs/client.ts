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
/** Our cut of every sale: 1.5%, rounded half-up to 2 decimals. */
export function platformFeeFor(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) return "0.00";
  // n * 0.015 rounded to the currency's precision.
  return (Math.round(n * 1.5) / 100).toFixed(2);
}

export async function createBankTransferCharge(params: {
  orderId: string;
  amount: string;
  email: string;
  customerName?: string;
  businessName: string;
  /** Vendor's Bachs Connect account, when the order has one. */
  vendorAccountId?: string | null;
}): Promise<BankTransferCharge> {
  const { orderId, amount, email, customerName, businessName, vendorAccountId } = params;

  // Destination charge: the sale lands in OUR platform balance and the
  // vendor's share is transferred down to `vendorAccountId`, with our 1.5%
  // cut stated as `platform_fee`. Bachs requires a split on a destination
  // charge (no fee → 400 INVALID_PLATFORM_FEE) and rejects a fee that is
  // zero or not strictly less than the gross, so only send the pair when
  // both sides are left something. Without a vendor account the session is
  // a plain charge, exactly as before.
  const platformFee = vendorAccountId ? platformFeeFor(amount) : null;
  const split =
    platformFee &&
    Number(platformFee) > 0 &&
    Number(platformFee) < Number(amount) &&
    vendorAccountId
      ? { platform_fee: platformFee, transfer_data: { destination: vendorAccountId } }
      : {};

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
      ...split,
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

// ---------------------------------------------------------------------------
// Connect (vendor onboarding)
//
// A vendor gets a connected account with the `recipient` persona so customer
// orders can be settled to it as destination charges. Capabilities live under
// `configuration.<persona>.capabilities` — a bare top-level `capabilities` key
// is silently ignored (Bachs returns 201 either way), so the nesting matters.
// ---------------------------------------------------------------------------

type VendorAccountResponse = {
  id: string;
  requirements?: { currently_due?: string[] } | null;
};

type AccountUpdateResponse = {
  id: string;
  requirements?: { currently_due?: string[] } | null;
};

type AccountLinkResponse = {
  id: string;
  url: string;
  expires_at?: string;
  previous_link_superseded?: boolean;
};

type ReferenceBanksResponse = {
  country?: string;
  banks?: { name?: string; code?: string }[];
};

type ResolveResponse = {
  resolved?: boolean;
  account_name?: string | null;
  message?: string;
};

export type ReferenceBank = { name: string; code: string };

/** Vendors sell from Nigeria — the NG bank list backs every payout destination. */
const VENDOR_COUNTRY = "NG";

/**
 * Creates the vendor's Bachs Connect account with the `recipient` persona and
 * the `payouts` + `transfers` capabilities requested (both are recipient
 * capabilities; without naming the persona neither can be requested). Sandbox
 * grants them `active` immediately; live lands them `restricted` until the
 * hosted onboarding is completed, and `capability.updated` reports the flip.
 *
 * Bank details are NOT sent here: `fields` is only read by the account update
 * endpoint, and `POST /v1/accounts` silently ignores what it does not know.
 * Send them to `submitVendorPayoutDestination()` right after this returns.
 */
export async function createVendorAccount(params: {
  contactEmail: string;
  displayName: string;
}): Promise<{ accountId: string; outstanding: string[] }> {
  const created = await bachsRequest<VendorAccountResponse>("POST", "/v1/accounts", {
    contact_email: params.contactEmail,
    display_name: params.displayName,
    country: VENDOR_COUNTRY,
    // Vendors onboard as individuals; company requirements can be added later
    // from the hosted flow or a follow-up account update.
    entity_type: "individual",
    configuration: {
      recipient: {
        capabilities: {
          transfers: { requested: true },
          payouts: { requested: true },
        },
      },
    },
  });
  if (!created.id) throw new Error("Bachs did not return an account id.");
  return {
    accountId: created.id,
    outstanding: created.requirements?.currently_due ?? [],
  };
}

/**
 * Best-effort lookup of the account holder's name for a bank account, so the
 * payout destination can be submitted complete. Returns null when it cannot be
 * resolved (unknown/test account, rate limit) — the hosted onboarding then asks
 * the vendor to confirm the name instead. Never throws.
 */
export async function resolveBankAccountName(
  accountNumber: string,
  bankCode: string
): Promise<string | null> {
  try {
    const res = await bachsRequest<ResolveResponse>("POST", "/v1/misc/bank-accounts/resolve", {
      account_number: accountNumber,
      bank_code: bankCode,
    });
    return res.resolved && res.account_name ? res.account_name : null;
  } catch (err) {
    console.warn(
      "[bachs] bank resolve failed, continuing without account_name:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Submits the vendor's bank account as the account's `payout_destination`
 * requirement (the field that actually enables withdrawing the balance).
 *
 * Requirement values ride on the account update endpoint, so this is a
 * `POST /v1/accounts/{id}` — the same path used to request more capabilities
 * later. An unresolved/omitted `account_name` is NOT a rejection: the write
 * succeeds and the destination stays `currently_due`, so the hosted flow just
 * asks for it. Returns whatever is still outstanding afterwards.
 */
export async function submitVendorPayoutDestination(params: {
  accountId: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  /** Pre-resolved holder name; resolved here when omitted. */
  accountName?: string | null;
}): Promise<{ outstanding: string[] }> {
  const { accountId, accountNumber, bankCode, bankName } = params;
  const accountName = params.accountName ?? (await resolveBankAccountName(accountNumber, bankCode));

  const updated = await bachsRequest<AccountUpdateResponse>(
    "POST",
    `/v1/accounts/${accountId}`,
    {
      fields: {
        payout_destination: {
          type: "bank_account",
          // NGN is the only rail that carries an NG local bank destination.
          currency: "NGN",
          account_number: accountNumber,
          bank_code: bankCode,
          // Legacy alias accepted alongside bank_code; keeps the destination
          // readable (and pre-fills the hosted flow) when present.
          bank_name: bankName,
          ...(accountName ? { account_name: accountName } : {}),
        },
      },
    }
  );
  return { outstanding: updated.requirements?.currently_due ?? [] };
}

/**
 * Mints the hosted onboarding link the vendor completes their identity
 * verification with, and returns its URL to redirect to.
 *
 * Single-use: a new link supersedes any previous one, so mint it at the moment
 * the vendor is about to open it (never on page render). `refresh_url` is hit
 * when a link is spent or expired — send them back to our payouts step, which
 * mints a fresh one — and `return_url` is where the hosted flow drops them,
 * whether or not they finished, so it must not claim success.
 */
export async function createVendorAccountLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
  type?: "onboarding" | "update";
}): Promise<string> {
  const link = await bachsRequest<AccountLinkResponse>(
    "POST",
    `/v1/accounts/${params.accountId}/account-links`,
    {
      type: params.type ?? "onboarding",
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
    }
  );
  if (!link.url) throw new Error("Bachs did not return an onboarding URL.");
  return link.url;
}

/**
 * NG bank list for the payout form (name + code pairs). Best-effort: returns
 * an empty list when unavailable so the form falls back to manual entry.
 */
export async function listReferenceBanks(country: string = VENDOR_COUNTRY): Promise<ReferenceBank[]> {
  try {
    const res = await bachsRequest<ReferenceBanksResponse>(
      "GET",
      `/v1/reference/banks?country=${encodeURIComponent(country)}`
    );
    return (res.banks ?? [])
      .map((b) => ({ name: (b.name ?? "").trim(), code: (b.code ?? "").trim() }))
      .filter((b) => b.name && b.code);
  } catch (err) {
    console.warn(
      "[bachs] reference banks unavailable, falling back to manual entry:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
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
