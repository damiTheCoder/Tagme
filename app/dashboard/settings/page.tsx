import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const supabase = await createClient();
  const { data: full } = await supabase
    .from("businesses")
    .select("name, description, hours, policies, notification_email, currency")
    .eq("id", business.id)
    .maybeSingle();

  if (!full) redirect("/onboarding");

  return (
    <SettingsForm
      initial={{
        name: full.name,
        description: full.description,
        hours: full.hours,
        policies: full.policies,
        notification_email: full.notification_email,
        currency: full.currency,
      }}
    />
  );
}
