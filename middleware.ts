import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth cookies on every request.
 *
 * Without this, the access-token cookie goes stale after ~1 hour and
 * every `supabase.auth.getUser()` / RLS query fails with "JWT expired".
 * `getUser()` revalidates and rotates the cookies when a refresh token
 * is available, then we return the response carrying the new cookies.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session if expired. Does not throw on missing session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Founder admin panel: fail closed with a 404 (never a redirect).
  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    const allowlist = (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!user || allowlist.length === 0 || !allowlist.includes(user.id)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip static assets, images, favicon. Run on everything else so
    // dashboard server components/actions always see fresh cookies.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
