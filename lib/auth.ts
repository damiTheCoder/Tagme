import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  currency: string;
  suspended_at?: string | null;
  deleted_at?: string | null;
  subscription_status?: string | null;
  subscription_ends_at?: string | null;
  orders_this_month?: number | null;
};

// Per-request memo: layout + page + actions share one auth/business
// lookup instead of re-querying. cache() never crosses requests,
// so no stale data risk.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Founder admin allowlist. Env var ONLY — no role column. Empty or
// missing allowlist denies everyone (fail closed).
export const getAdminUser = cache(
  async (): Promise<{ id: string; email: string | null } | null> => {
    const user = await getCurrentUser();
    if (!user) return null;
    const allowlist = (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowlist.length === 0) return null;
    if (!allowlist.includes(user.id)) return null;
    return { id: user.id, email: user.email ?? null };
  }
);

export const IMPERSONATE_COOKIE = "admin_impersonate";

// The business an admin is currently viewing as, if impersonation is
// active (cookie set + admin verified). Null otherwise.
export const getImpersonatedBusiness = cache(
  async (): Promise<Business | null> => {
    let businessId: string | undefined;
    try {
      businessId = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
    } catch {
      return null;
    }
    if (!businessId) return null;
    const admin = await getAdminUser();
    if (!admin) return null;
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("businesses")
        .select("id, owner_id, name, slug, description, currency, suspended_at, deleted_at")
        .eq("id", businessId)
        .maybeSingle();
      if (error) return null;
      return (data as Business | null) ?? null;
    } catch {
      return null;
    }
  }
);

// TEMP perf instrumentation for cold-start diagnosis — remove after.
export const getCurrentBusiness = cache(async (): Promise<Business | null> => {
  // Founder impersonation takes precedence over the admin's own business.
  const impersonated = await getImpersonatedBusiness();
  if (impersonated) return impersonated;

  const t0 = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log(`[perf] getCurrentBusiness auth.getUser +${Date.now() - t0}ms`);
  if (!user) return null;

  const t1 = Date.now();
  let { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id, name, slug, description, currency, suspended_at, deleted_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  console.log(`[perf] getCurrentBusiness businesses select +${Date.now() - t1}ms`);

  // Pre-migration fallback: suspended_at/deleted_at may not exist yet.
  if (error && /suspended_at|deleted_at|column/i.test(error.message)) {
    const retry = await supabase
      .from("businesses")
      .select("id, owner_id, name, slug, description, currency")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (retry.error) throw retry.error;
    return retry.data;
  }
  if (error) throw error;
  return data;
});
