import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Append-only audit trail for founder actions. Fire-and-forget: insert
 * failures are swallowed so logging can never block the request.
 * Table has no RLS — service-role access only.
 */
export async function logAdminAction({
  adminUserId,
  action,
  targetType,
  targetId,
  metadata,
}: {
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    let ip: string | null = null;
    let ua: string | null = null;
    try {
      const h = await headers();
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip")?.trim() ||
        null;
      ua = h.get("user-agent");
    } catch {
      // No header context (e.g. background) — log without it.
    }
    const supabase = createAdminClient();
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      metadata: metadata ?? null,
      ip_address: ip,
      user_agent: ua,
    });
  } catch {
    // Never block the request on audit failure.
  }
}
