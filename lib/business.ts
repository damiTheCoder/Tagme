import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ensure a business slug is globally unique.
 * Uses the service-role client (bypasses RLS) so collisions are
 * visible across owners — the owner-scoped RLS read policy would
 * otherwise hide other users' slugs. The actual insert still uses
 * the authenticated user client so RLS applies there.
 */
export async function ensureUniqueSlug(base: string): Promise<string> {
  const fallback = base || "business";
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("businesses")
    .select("slug")
    .like("slug", `${fallback}%`);

  if (error) throw error;

  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(fallback)) return fallback;

  let n = 2;
  while (taken.has(`${fallback}-${n}`)) n++;
  return `${fallback}-${n}`;
}
