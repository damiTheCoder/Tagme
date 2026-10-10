import { createAdminClient } from "@/lib/supabase/admin";
import { ChatShell } from "./chat-shell";

export default async function PublicChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, currency")
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
    />
  );
}
