-- ============================================================
-- tagly vendor onboarding & Bachs Connect (migration 15)
-- Run this in the Supabase SQL editor.
--
-- Vendors get a Bachs Connect account during onboarding so customer
-- orders can be settled as destination charges: the sale lands in our
-- platform balance, `platform_fee` keeps our 1.5% cut, and the rest is
-- transferred to the vendor's account automatically.
-- ============================================================

-- Bachs connected-account identity (acct_…), created with the
-- `recipient` persona + `payouts` capability at onboarding.
alter table businesses add column if not exists bachs_account_id text;

-- Payout bank details collected on the onboarding payouts step and
-- submitted to Bachs as the account's `payout_destination`.
alter table businesses add column if not exists bank_account_number text;
alter table businesses add column if not exists bank_code text;
alter table businesses add column if not exists bank_name text;

-- Last `capability.updated` status Bachs reported for this account's
-- payouts capability. NULL until the first event lands; 'active' is the
-- ready marker and is mirrored into payouts_ready for simple gating.
alter table businesses add column if not exists bachs_payouts_status text;
alter table businesses add column if not exists payouts_ready boolean not null default false;

-- Webhook handler looks the vendor up by Bachs account id.
create index if not exists idx_businesses_bachs_account
  on businesses(bachs_account_id)
  where bachs_account_id is not null;
