import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/bachs/client";

type BachsEvent = {
  id?: string;
  type?: string;
  /** On Connect events this is the connected account, not our platform. */
  account?: string;
  data?: {
    checkout_id?: string;
    charge_id?: string;
    payment_id?: string;
    subscription_id?: string;
    status?: string;
    // Connect events (capability.updated / account.updated) carry the
    // connected account id and the capability that changed.
    account?: string;
    capability?: string;
    metadata?: Record<string, string | undefined> | null;
    meta?: Record<string, string | undefined> | null;
    charge?: {
      checkout_id?: string;
      payment_id?: string;
      meta?: Record<string, string | undefined> | null;
    } | null;
  } | null;
};

async function businessIdForSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  metadata: Record<string, string | undefined> | null | undefined,
  subscriptionId?: string
): Promise<string | null> {
  if (metadata?.business_id) return metadata.business_id;
  if (subscriptionId) {
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("subscription_id", subscriptionId)
      .maybeSingle();
    if (data) return data.id;
  }
  return null;
}

/**
 * Bank-transfer charges only expose their reference under `meta` (not
 * `metadata`), and it can be nested inside `charge`. Check every shape.
 */
function orderIdFrom(data: NonNullable<BachsEvent["data"]>): string | null {
  return (
    data.metadata?.order_id ??
    data.meta?.order_id ??
    data.charge?.meta?.order_id ??
    null
  );
}

/** Mark an order paid + stamp the charge id. Idempotent on repeat events. */
async function markOrderPaid(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
  chargeId?: string
): Promise<void> {
  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      status: "paid",
      paid_at: new Date().toISOString(),
      ...(chargeId ? { bachs_charge_id: chargeId } : {}),
    })
    .eq("id", orderId)
    .neq("payment_status", "paid");
}

export async function POST(req: Request) {
  // Raw body is mandatory — parsed JSON would break signature verification.
  const rawBody = await req.text();
  const signature = req.headers.get("x-bachs-signature") ?? "";
  const timestamp = req.headers.get("x-bachs-timestamp") ?? "";
  if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as BachsEvent;
    const supabase = createAdminClient();
    const data = event.data ?? {};
    const metadata = data.metadata ?? {};

    switch (event.type) {
      // Bank-transfer charges (customer chat orders) emit charge.* events.
      case "charge.succeeded": {
        const orderId = orderIdFrom(data);
        if (orderId) {
          await markOrderPaid(
            supabase,
            orderId,
            data.charge_id ?? data.payment_id ?? data.charge?.payment_id
          );
        }
        break;
      }
      case "charge.failed":
      case "charge.expired": {
        const orderId = orderIdFrom(data);
        if (orderId) {
          await supabase
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("id", orderId)
            .neq("payment_status", "paid");
        }
        break;
      }
      case "collection.succeeded": {
        if (metadata.order_id) {
          await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
              bachs_checkout_id: data.checkout_id ?? null,
            })
            .eq("id", metadata.order_id);
        }
        if (metadata.business_id && metadata.kind === "subscription") {
          const endsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
          await supabase
            .from("businesses")
            .update({
              subscription_status: "active",
              subscription_id: data.subscription_id ?? null,
              subscription_ends_at: endsAt,
            })
            .eq("id", metadata.business_id);
        }
        break;
      }
      case "collection.failed": {
        if (metadata.order_id) {
          await supabase
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("id", metadata.order_id);
        }
        break;
      }
      // Connect onboarding: a vendor's payouts capability changed status.
      // This is the only trustworthy "ready" signal — the hosted flow's
      // return redirect fires whether or not verification finished — and a
      // capability can flip back to restricted, so treat every event as the
      // current state rather than a one-off unlock.
      case "capability.updated": {
        const accountId = data.account ?? event.account ?? null;
        const status = data.status;
        if (accountId && data.capability === "payouts" && status) {
          await supabase
            .from("businesses")
            .update({
              bachs_payouts_status: status,
              payouts_ready: status === "active",
            })
            .eq("bachs_account_id", accountId);
        }
        break;
      }
      case "customer.subscription.created": {
        const businessId = await businessIdForSubscription(
          supabase,
          metadata,
          data.subscription_id
        );
        if (businessId) {
          await supabase
            .from("businesses")
            .update({
              subscription_id: data.subscription_id ?? null,
              subscription_status: "active",
            })
            .eq("id", businessId);
        }
        break;
      }
      case "customer.subscription.updated": {
        if (data.status === "past_due") {
          const businessId = await businessIdForSubscription(
            supabase,
            metadata,
            data.subscription_id
          );
          if (businessId) {
            await supabase
              .from("businesses")
              .update({ subscription_status: "past_due" })
              .eq("id", businessId);
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const businessId = await businessIdForSubscription(
          supabase,
          metadata,
          data.subscription_id
        );
        if (businessId) {
          await supabase
            .from("businesses")
            .update({ subscription_status: "canceled" })
            .eq("id", businessId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // Return 200 anyway — Bachs retries on non-2xx and would duplicate-fire.
    console.error("[bachs webhook] handler error:", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ received: true });
}
