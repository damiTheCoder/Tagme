import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { createVendorBachsAccount } from "../../actions";
import { getPayoutState } from "../state";
import { Button } from "@/components/ui/button";

/**
 * `return_url` for the hosted onboarding link.
 *
 * The hosted flow lands here whether the vendor finished or walked away, so
 * nothing here claims success — it reports what Bachs last told us (via
 * `capability.updated`) and offers a fresh link, since account links are
 * single-use. The real confirmation is the webhook flipping payouts active.
 */
export default async function PayoutsReturnPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const state = await getPayoutState(user.id);
  if (!state.bachs_account_id) redirect("/onboarding/payouts");

  const ready = state.payouts_ready;
  const reviewing =
    !ready && (state.bachs_payouts_status === "pending" || state.bachs_payouts_status === "restricted");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Payouts · Verification
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {ready ? "You're verified" : "Thanks — we've got it"}
        </h1>

        {ready ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Your payouts capability is active. Orders you approve now settle straight to{" "}
            {state.bank_name || "your bank"} {state.bank_account_number && `••${state.bank_account_number.slice(-4)}`}.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {reviewing
              ? "Bachs is reviewing your details. This page can't confirm that on its own — we wait for their webhook and switch payouts on the moment they're active."
              : "You can finish or re-open verification whenever you like; the link we emailed is single-use, so ask for a fresh one below."}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#1a1a1a] px-4 text-sm font-medium text-white hover:bg-[#1a1a1a]/90 dark:bg-white dark:text-black"
          >
            Go to dashboard
          </Link>

          {!ready && (
            <form action={createVendorBachsAccount}>
              <Button type="submit" variant="outline" className="w-full">
                Reopen verification
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
