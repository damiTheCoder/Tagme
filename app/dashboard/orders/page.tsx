import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { listOrders, type OrderFilter } from "./actions";
import { OrdersView } from "./orders-view";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const { filter: rawFilter } = await searchParams;
  const filter: OrderFilter =
    rawFilter === "all" || rawFilter === "approved" || rawFilter === "declined" ? rawFilter : "pending";

  const result = await listOrders(filter);
  if (!result.ok) throw new Error(result.error);

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Review new orders and approve them for fulfillment." />
      <OrdersView orders={result.orders} filter={filter} />
    </div>
  );
}
