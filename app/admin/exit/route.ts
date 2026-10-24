import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IMPERSONATE_COOKIE } from "@/lib/auth";

/** "Exit" link target: clears the impersonation cookie, returns to /admin. */
export async function GET() {
  const store = await cookies();
  store.delete(IMPERSONATE_COOKIE);
  redirect("/admin");
}
