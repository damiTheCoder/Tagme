import type { Metadata, Viewport } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatShell } from "./chat-shell";

/** Full-bleed chat: extend under the notch and keep the composer above the keyboard. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Chat with the shop · Tagly",
  description:
    "Message the shop, browse products and place an order with Tagly.",
  appleWebApp: { capable: true, title: "Tagly", statusBarStyle: "default" },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export default async function PublicChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, currency, suspended_at, deleted_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 p-8 dark:bg-zinc-950">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow dark:border dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
          <h1 className="text-xl font-bold">This link is not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The shop you&apos;re looking for doesn&apos;t exist or the link is
            incorrect.
          </p>
        </div>
      </main>
    );
  }

  if (business.suspended_at || business.deleted_at) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 p-8 dark:bg-zinc-950">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow dark:border dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
          <h1 className="text-xl font-bold">Temporarily unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This business is temporarily unavailable. Please check back later.
          </p>
        </div>
      </main>
    );
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, public_id, name, price, image_url, in_stock")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true })
    .limit(20);

  return (
    <>
      {/* Fonts + backdrop are hinted up front so the first paint already has
          the right metrics and artwork instead of reflowing or flashing. */}
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/fonts/GlacialIndifference-Regular.woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/fonts/GlacialIndifference-Bold.woff2"
        crossOrigin="anonymous"
      />
      <link rel="preload" as="image" href="/page%20modal.jpeg?v=2" />
      <ChatShell
        businessName={business.name}
        businessSlug={business.slug}
        initialProducts={(products ?? []).map((p) => ({
          id: p.id,
          public_id: p.public_id,
          name: p.name,
          price: p.price,
          currency: business.currency,
          image_url: p.image_url,
          in_stock: p.in_stock,
        }))}
      />
    </>
  );
}
