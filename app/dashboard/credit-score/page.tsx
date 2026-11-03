import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { getCreditScore } from "./actions";
import { CreditView } from "./credit-view";

export default async function CreditScorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const result = await getCreditScore();
  if (!result.ok) {
    return <div className="p-6">{result.error}</div>;
  }

  return <CreditView summary={result.summary} business={business as any} />;
}
