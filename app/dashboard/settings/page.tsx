import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPayoutState } from "@/app/onboarding/payouts/state";
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

  const payoutState = await getPayoutState(user.id);
  const maskedAccount = payoutState.bank_account_number
    ? `******${payoutState.bank_account_number.slice(-4)}`
    : "Not set";

  return (
    <>
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Payout Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Account number: {maskedAccount}
        </p>
        <span
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            payoutState.payouts_ready
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {payoutState.payouts_ready ? "Verified" : "Pending Verification"}
        </span>
      </div>
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
    </>
  );
}
