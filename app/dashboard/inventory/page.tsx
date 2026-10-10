import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { listInventory } from "./actions";
import { InventoryView } from "./inventory-view";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";

  const result = await listInventory();
  if (!result.ok) throw new Error(result.error);
  console.log("[perf] inventory page render data ready");

  return (
    <InventoryView
      products={result.products}
      currency={business.currency}
      shareBase={`${proto}://${host}/b/${business.slug}`}
    />
  );
}
