import { redirect } from "next/navigation";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { listInventory } from "./actions";
import { InventoryView } from "./inventory-view";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const result = await listInventory();
  if (!result.ok) throw new Error(result.error);
  console.log("[perf] inventory page render data ready");

  return (
    <InventoryView
      products={result.products}
      currency={business.currency}
    />
  );
}
