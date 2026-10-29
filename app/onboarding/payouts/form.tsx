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
      <label className="text-sm font-medium">
        Account Number
        <input
          name="accountNumber"
          required
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
          autoComplete="off"
          defaultValue={defaults.accountNumber}
          placeholder="10-digit account number"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm font-medium">
        Bank Name
        <select
          name="bankCode"
          required
          value={bankCode}
          onChange={(e) => {
            const code = e.target.value;
            setBankCode(code);
            setBankName(banks.find((b) => b.code === code)?.name ?? "");
          }}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
      </label>

      {manual || banks.length === 0 ? (
        <>
          <input
            name="bankCode"
            required
            defaultValue={bankCode === MANUAL ? defaults.bankCode : bankCode}
            placeholder="Bank code (e.g. 058)"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            name="bankName"
            required
            defaultValue={bankName}
            placeholder="Account name"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </>
      ) : (
        <>
          {/* Derived from the selection above; Bachs stores both. */}
          <input type="hidden" name="bankName" value={bankName} />
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
