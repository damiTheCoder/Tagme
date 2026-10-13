import { redirect } from "next/navigation";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { listTransactions, getDailyTotals, getExpenseSummary } from "../transactions/actions";
import { ExpensesView } from "./expenses-view";

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const year = new Date().getFullYear();
  const [list, summary, daily] = await Promise.all([
    listTransactions({ type: "expense", timeRange: "all" }),
    getExpenseSummary(),
    getDailyTotals({ type: "expense", year }),
  ]);
  if (!list.ok) throw new Error(list.error);
  if (!summary.ok) throw new Error(summary.error);

  return (
    <ExpensesView
      initial={list.data}
      summary={summary.data}
      currency={business.currency}
      initialDaily={daily.ok ? daily.data : []}
      initialYear={year}
    />
  );
}
