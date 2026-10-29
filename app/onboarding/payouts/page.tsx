import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { listReferenceBanks, type ReferenceBank } from "@/lib/bachs/client";
import { getPayoutState } from "./state";
import { PayoutsForm } from "./form";

/**
 * Onboarding step 2: where the vendor gets paid.
 *
 * Reached from `createBusiness` (fresh vendor) and from the hosted flow's
 * `refresh_url` (a spent or expired account link lands back here so we can
 * mint a new one) — hence the "continue verification" state below.
 */
export default async function PayoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const state = await getPayoutState(user.id);
  const banks: ReferenceBank[] = await listReferenceBanks();

  const heading = state.bachs_account_id ? "Continue verification" : "Where should we pay you?";
  const blurb = state.bachs_account_id
    ? "Your payout details are saved. We'll open a fresh verification link — the previous one is single-use."
    : "Add the bank account for your payouts. We'll create your Bachs account and take you to identity verification.";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step 3: Payout Details
        </p>
        <h1 className="mt-1 text-2xl font-bold">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the bank account where you want to receive payments from your customers.
        </p>

        {state.payouts_ready && (
          <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Payouts are active on your account.
          </p>
        )}
        {!state.payouts_ready &&
          state.bachs_account_id &&
          state.bachs_payouts_status === "restricted" && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Bachs has your details and is still reviewing. You can keep using the dashboard — we'll
              flip payouts on automatically.
            </p>
          )}

        <PayoutsForm
          banks={banks}
          defaults={{
            accountNumber: state.bank_account_number,
            bankCode: state.bank_code,
            bankName: state.bank_name,
          }}
          hasAccount={Boolean(state.bachs_account_id)}
          columnsMissing={state.columnsMissing}
        />
      </div>
    </main>
  );
}
