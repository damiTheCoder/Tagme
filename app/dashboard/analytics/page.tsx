import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { getAnalytics } from "./analytics";
import { AnalyticsView } from "./analytics-view";
import { EmptyState } from "@/components/dashboard/empty-state";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const stats = await getAnalytics(90);

  if (stats.totalOrders === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Not enough data yet"
        description={`Share your business link to start taking orders: /b/${business.slug}`}
        action={
          <Link href={`/b/${business.slug}`} className="text-sm text-[#0066ff] underline">
            View your public page
          </Link>
        }
      />
    );
  }

  return (
    <AnalyticsView
      daily={stats.daily}
      currency={business.currency}
      totalOrders={stats.totalOrders}
      totalRevenue={stats.totalRevenue}
      repeatCustomers={stats.repeatCustomers}
      conversionRate={stats.conversionRate}
      topProducts={stats.topProducts}
    />
  );
}
