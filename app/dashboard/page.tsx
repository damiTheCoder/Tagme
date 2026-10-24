import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";
import { LazyAssistantBar } from "@/components/dashboard/assistant/assistant-bar-lazy";

export default async function AssistantHomePage() {
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  return <LazyAssistantBar business={business} fullPage />;
}
