import { createClient } from "@/lib/supabase/server";

/**
 * The payout slice of a vendor's business row.
 *
 * These columns arrive with migration 15, so every reader degrades to
 * `columnsMissing` instead of throwing while the migration is pending — the
 * server action then tells the vendor exactly which SQL to run.
 */
export type PayoutState = {
  bank_account_number: string;
  bank_code: string;
  bank_name: string;
  bachs_account_id: string | null;
  bachs_payouts_status: string | null;
  payouts_ready: boolean;
  columnsMissing: boolean;
};

const EMPTY: PayoutState = {
  bank_account_number: "",
  bank_code: "",
  bank_name: "",
  bachs_account_id: null,
  bachs_payouts_status: null,
  payouts_ready: false,
  columnsMissing: false,
};

export async function getPayoutState(ownerId: string): Promise<PayoutState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "bank_account_number, bank_code, bank_name, bachs_account_id, bachs_payouts_status, payouts_ready"
    )
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (/column|schema/i.test(error.message)) return { ...EMPTY, columnsMissing: true };
    throw new Error(error.message);
  }
  if (!data) return EMPTY;

  return {
    bank_account_number: (data.bank_account_number as string | null) ?? "",
    bank_code: (data.bank_code as string | null) ?? "",
    bank_name: (data.bank_name as string | null) ?? "",
    bachs_account_id: (data.bachs_account_id as string | null) ?? null,
    bachs_payouts_status: (data.bachs_payouts_status as string | null) ?? null,
    payouts_ready: Boolean(data.payouts_ready),
    columnsMissing: false,
  };
}
