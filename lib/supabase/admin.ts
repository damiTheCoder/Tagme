import "server-only";
import { createClient } from "@supabase/supabase-js";

type AdminClient = ReturnType<typeof buildAdminClient>;

// Singleton: the admin client holds no per-request state (service role,
// no session persistence), so one instance is shared. This avoids
// opening fresh connections on every tool call in serverless.
let adminClient: AdminClient | null = null;

function buildAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export function createAdminClient() {
  if (!adminClient) {
    adminClient = buildAdminClient();
  }
  return adminClient;
}
