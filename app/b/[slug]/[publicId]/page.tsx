import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatShell } from "../chat-shell";

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
  );
}
