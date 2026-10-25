import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatShell } from "../chat-shell";

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

export default async function ProductChatPage({
  params,
}: {
  params: Promise<{ slug: string; publicId: string }>;
}) {
  const { slug, publicId } = await params;

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, currency")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) notFound();

  const { data: product } = await supabase
    .from("products")
    .select("id, public_id, name, price, image_url, in_stock")
    .eq("business_id", business.id)
    .eq("public_id", publicId.toUpperCase())
    .maybeSingle();

  if (!product) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("id, public_id, name, price, image_url, in_stock")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true })
    .limit(20);

  return (
    <>
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
        initialInterest={{ name: product.name, publicId: product.public_id }}
      />
    </>
  );
}
