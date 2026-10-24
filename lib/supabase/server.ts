import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createClient() {
  const cookieStore = await cookies();

  const userClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookies are read-only there.
          }
        },
      },
    }
  );

  // Founder impersonation: a verified admin holding an admin_impersonate
  // cookie views the dashboard AS that merchant. Owner-scoped RLS would
  // return zero rows for them, so elevate to the service-role client.
  // Gated on auth user + ADMIN_USER_IDS on every call (fail closed).
  // No cookie → zero behavior change.
  try {
    const impersonatedId = cookieStore.get("admin_impersonate")?.value;
    if (impersonatedId) {
      const {
        data: { user },
      } = await userClient.auth.getUser();
      const allowlist = (process.env.ADMIN_USER_IDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (user && allowlist.length > 0 && allowlist.includes(user.id)) {
        const admin = createAdminClient();
        return admin as unknown as typeof userClient;
      }
    }
  } catch {
    // Read-only cookie context — fall through to the user client.
  }

  return userClient;
}
