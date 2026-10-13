import { redirect } from "next/navigation";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { listTransactions, getDailyTotals, getRevenueSummary } from "../transactions/actions";
import { RevenueView } from "./revenue-view";

export default async function RevenuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const year = new Date().getFullYear();
  const [list, summary, daily] = await Promise.all([
    listTransactions({ type: "income", timeRange: "all" }),
    getRevenueSummary(),
    getDailyTotals({ type: "income", year }),
  ]);
  if (!list.ok) throw new Error(list.error);
  if (!summary.ok) throw new Error(summary.error);

  return (
    <RevenueView
      initial={list.data}
      summary={summary.data}
      currency={business.currency}
      initialDaily={daily.ok ? daily.data : []}
      initialYear={year}
    />
  );
}
