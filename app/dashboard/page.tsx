import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";

export default async function HomePage() {
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");
  redirect("/dashboard/overview");
}