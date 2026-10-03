import { Resend } from "resend";

export type NotifyOrderItem = {
  name: string;
  quantity: number;
  unit_price: number;
};

export type NotifyRequest = {
  businessId: string;
  orderId: string;
  items: NotifyOrderItem[];
  total: number;
  currency: string;
  customerName: string | null;
  customerPhone: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Email the owner about a new pending order. Never throws — any
 * failure (missing key, missing migration column, provider error)
 * is logged and skipped so the order itself is never affected.
 */
export async function sendOrderNotification(req: NotifyRequest): Promise<void> {
  try {
    // Trimmed: a stray space/newline from copy-paste into .env.local
    // would otherwise send a wrong key and fail auth.
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.error("[email] skipped: RESEND_API_KEY is not set.");
      return;
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    const { data: business, error } = await supabase
      .from("businesses")
      .select("name, notification_email, notification_enabled")
      .eq("id", req.businessId)
      .maybeSingle();
    if (error || !business) {
      console.error(
        "[email] skipped: could not load business prefs.",
        error?.message ?? null
      );
      return;
    }
    if (business.notification_enabled === false) return;
    if (!business.notification_email) {
      console.error("[email] skipped: no notification_email set.");
      return;
    }

    const customerLabel = req.customerName ?? "a customer";
    const subject = `New order from ${customerLabel} — ${req.currency} ${req.total}`;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const dashboardUrl = `${appUrl}/dashboard/orders/${req.orderId}`;
    const digits = (req.customerPhone ?? "").replace(/\D/g, "");
    const waLink = digits ? `https://wa.me/${digits}` : null;

    const itemLines = req.items.map(
      (i) =>
        `- ${i.name} x ${i.quantity} — ${req.currency} ${Math.round(i.unit_price * i.quantity * 100) / 100}`
    );

    const text = [
      `Customer: ${req.customerName ?? "—"} (${req.customerPhone ?? "—"})`,
      `Items:`,
      ...itemLines,
      `Total: ${req.currency} ${req.total}`,
      ...(waLink ? [`WhatsApp: ${waLink}`] : []),
      `View in dashboard: ${dashboardUrl}`,
    ].join("\n");

    const esc = escapeHtml;
    const html = [
      `<p>Customer: ${esc(req.customerName ?? "—")} (${esc(req.customerPhone ?? "—")})</p>`,
      `<p>Items:</p>`,
      `<ul>${req.items
        .map(
          (i) =>
            `<li>${esc(i.name)} x ${i.quantity} — ${esc(req.currency)} ${Math.round(i.unit_price * i.quantity * 100) / 100}</li>`
        )
        .join("")}</ul>`,
      `<p><strong>Total: ${esc(req.currency)} ${req.total}</strong></p>`,
      ...(waLink
        ? [
            `<p>WhatsApp: <a href="${waLink}">${esc(req.customerPhone ?? waLink)}</a></p>`,
          ]
        : []),
      `<p><a href="${dashboardUrl}">View in dashboard</a></p>`,
    ].join("\n");

    const resend = new Resend(apiKey);
    // Empty string must fall back too — `??` alone would keep "".
    const rawFrom = (process.env.EMAIL_FROM ?? "").trim();
    const from = rawFrom || "orderlink <onboarding@resend.dev>";
    const { error: sendError } = await resend.emails.send({
      from,
      to: business.notification_email,
      subject,
      text,
      html,
    });
    if (sendError) {
      console.error("[email] send failed:", sendError.message);
    }
  } catch (e) {
    console.error(
      "[email] notify failed:",
      e instanceof Error ? e.message : e
    );
  }
}
