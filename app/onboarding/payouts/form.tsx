"use client";

import { useState } from "react";
import { createVendorBachsAccount } from "../actions";
import { Button } from "@/components/ui/button";

type BankOption = { name: string; code: string };

/** Select value that flips the bank picker into free-text entry. */
const MANUAL = "__manual__";

export function PayoutsForm({
  banks,
  defaults,
  hasAccount,
  columnsMissing,
}: {
  banks: BankOption[];
  defaults: { accountNumber: string; bankCode: string; bankName: string };
  hasAccount: boolean;
  columnsMissing: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Saved pair is preselected when it is in the reference list, otherwise the
  // picker starts in manual mode so the stored code/name are still editable.
  const savedIsListed = banks.some((b) => b.code === defaults.bankCode);
  const [bankCode, setBankCode] = useState(
    !defaults.bankCode ? "" : savedIsListed ? defaults.bankCode : MANUAL
  );
  const [bankName, setBankName] = useState(defaults.bankName);
  const manual = bankCode === MANUAL;

  async function onSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      await createVendorBachsAccount(formData);
      // Redirects to Bachs — leave the button in its submitting state.
    } catch (e) {
      // Next.js redirects throw; don't surface those as errors.
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form action={onSubmit} className="mt-4 flex flex-col gap-3">
      <input
        name="bank_account_number"
        required
        inputMode="numeric"
        autoComplete="off"
        defaultValue={defaults.accountNumber}
        placeholder="Bank account number"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      {banks.length > 0 && (
        <select
          name="bank_code"
          required
          value={bankCode}
          onChange={(e) => {
            const code = e.target.value;
            setBankCode(code);
            setBankName(banks.find((b) => b.code === code)?.name ?? "");
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select your bank
          </option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name} ({b.code})
            </option>
          ))}
          <option value={MANUAL}>Enter bank details manually</option>
        </select>
      )}

      {manual || banks.length === 0 ? (
        <>
          <input
            name="bank_code"
            required
            defaultValue={bankCode === MANUAL ? defaults.bankCode : bankCode}
            placeholder="Bank code (e.g. 058)"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            name="bank_name"
            required
            defaultValue={bankName}
            placeholder="Bank name"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </>
      ) : (
        <>
          {/* Derived from the selection above; Bachs stores both. */}
          <input type="hidden" name="bank_name" value={bankName} />
          <p className="text-xs text-muted-foreground">
            {bankName || "We'll store this bank's name and code with your account."}
          </p>
        </>
      )}

      {columnsMissing && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          The payout columns are not in the database yet — run
          supabase/migration_15_vendor_connect.sql, then submit again.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading
          ? "Creating your account…"
          : hasAccount
            ? "Continue verification"
            : "Set up payouts"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Next you&apos;ll be sent to Bachs to verify your identity. Payouts turn on automatically once
        they approve the account.
      </p>
    </form>
  );
}
