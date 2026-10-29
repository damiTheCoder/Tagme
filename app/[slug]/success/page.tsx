import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default async function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const orderParam = Array.isArray(sp.order) ? sp.order[0] : sp.order;

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, currency")
    .eq("slug", slug)
    .maybeSingle();

  let total: string | null = null;
  if (business && typeof orderParam === "string" && orderParam) {
    const { data: order } = await supabase
      .from("orders")
      .select("total, currency, business_id")
      .eq("id", orderParam)
      .maybeSingle();
    if (order && order.business_id === business.id) {
      total = formatCurrency(Number(order.total), order.currency ?? business.currency);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-8 dark:bg-zinc-950">
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl p-8 text-center">
        <CheckCircle2 size={64} className="text-green-500" />
        <h1 className="mt-4 text-2xl font-bold">Payment successful</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order{total ? ` (${total})` : ""} has been confirmed.{" "}
          {business?.name ?? "The vendor"} will be in touch.
        </p>
        <Link href={`/${slug}`} className="mt-6">
          <Button>Back to chat</Button>
        </Link>
      </div>
    </main>
  );
}
