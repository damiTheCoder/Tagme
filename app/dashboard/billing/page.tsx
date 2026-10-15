import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { BillingToasts } from "./billing-toasts";
import { ManageButton, UpgradeButton } from "./billing-buttons";

const FREE_ORDER_LIMIT = 10;

export default async function BillingPage() {
  const business = await getCurrentBusiness();
  if (!business) redirect("/login");

  const supabase = await createClient();
  // Subscription fields live outside the base business select so the page
  // keeps working before migration_13 is applied.
  let status: string | null = null;
  let endsAt: string | null = null;
  let counter: number | null = null;
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select("subscription_status, subscription_ends_at, orders_this_month")
      .eq("id", business.id)
      .maybeSingle();
    if (error) throw error;
    status = (data?.subscription_status as string | null) ?? null;
    endsAt = (data?.subscription_ends_at as string | null) ?? null;
    counter = (data?.orders_this_month as number | null) ?? null;
  } catch {
    // Pre-migration: fall through to the free plan view.
  }
  if (counter == null) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("created_at", monthStart.toISOString());
    counter = count ?? 0;
  }

  const isPro = status === "active";

  return (
    <div className="space-y-6">
      <BillingToasts />
      <PageHeader
        title="Billing"
        description="Your plan and usage."
        action={isPro ? <ManageButton /> : <UpgradeButton />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isPro ? (
              <>
                <p className="text-xl font-semibold">Pro Plan — ₦3,000/month</p>
                <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Active
                </span>
                {endsAt && (
                  <p className="text-sm text-gray-500">
                    Next billing: {new Date(endsAt).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xl font-semibold">Free Plan</p>
                <p className="text-sm text-gray-500">
                  10 orders per month. Upgrade for unlimited orders.
                </p>
                <div className="mt-1">
                  <UpgradeButton />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {isPro ? (
              <p className="text-sm">
                Orders this month:{" "}
                <span className="font-semibold tabular-nums">{counter}</span> — unlimited
              </p>
            ) : (
              <>
                <p className="text-sm">
                  Orders this month:{" "}
                  <span className="font-semibold tabular-nums">{counter}</span> /{" "}
                  {FREE_ORDER_LIMIT}
                </p>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#006DFF]"
                    style={{ width: `${Math.min(100, Math.round((counter / FREE_ORDER_LIMIT) * 100))}%` }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {!isPro && (
        <Card>
          <CardHeader>
            <CardTitle>Free vs Pro</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-zinc-800">
              <p className="font-semibold">Free</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-500">
                <li>Up to 10 orders per month</li>
                <li>AI chat assistant</li>
                <li>Order dashboard</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="font-semibold">Pro — ₦3,000/month</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-500">
                <li>Unlimited orders</li>
                <li>Online customer payments</li>
                <li>Sales records and credit profile</li>
              </ul>
              <div className="mt-3">
                <UpgradeButton label="Upgrade" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
