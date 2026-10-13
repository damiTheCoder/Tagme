import { redirect } from "next/navigation";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { getCreditScore } from "./actions";
import { CreditView } from "./credit-view";

export default async function CreditScorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const result = await getCreditScore();
  if (!result.ok) throw new Error(result.error);

  return <CreditView summary={result.summary} business={business} />;
}
