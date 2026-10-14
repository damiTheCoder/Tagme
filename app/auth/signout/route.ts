import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATE_COOKIE } from "@/lib/auth";

export async function POST() {
  // Clear impersonation FIRST: with the cookie present createClient()
  // elevates to the service-role client, whose signOut is a no-op that
  // would leave the admin's real session alive.
  (await cookies()).delete(IMPERSONATE_COOKIE);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
