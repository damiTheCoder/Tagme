import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShopView } from "./shop-view";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Shop · Tagly",
  description: "Browse products and place an order.",
};

export default async function ShopPage({
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

  if (!business || business.suspended_at || business.deleted_at) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("id, public_id, name, price, image_url, in_stock")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  return (
    <ShopView
      businessName={business.name}
      businessSlug={business.slug}
      currency={business.currency}
      products={(products ?? []).map((p) => ({
        id: p.id,
        public_id: p.public_id,
        name: p.name,
        price: Number(p.price),
        currency: business.currency,
        image_url: p.image_url,
        in_stock: p.in_stock,
      }))}
    />
  );
}
