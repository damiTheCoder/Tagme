import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  currency: string;
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

// TEMP perf instrumentation for cold-start diagnosis — remove after.
export const getCurrentBusiness = cache(async (): Promise<Business | null> => {
  const t0 = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log(`[perf] getCurrentBusiness auth.getUser +${Date.now() - t0}ms`);
  if (!user) return null;

  const t1 = Date.now();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id, name, slug, description, currency")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  console.log(`[perf] getCurrentBusiness businesses select +${Date.now() - t1}ms`);

  if (error) throw error;
  return data;
});
