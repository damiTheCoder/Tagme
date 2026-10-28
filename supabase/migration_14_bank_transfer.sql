-- ============================================================
-- tagly bank transfer checkout migration (migration 14)
-- Run this in the Supabase SQL editor.
--
-- Bachs returns the reserved virtual account details ONLY in the
-- confirm response — they are never retrievable via GET, and
-- re-confirming the session fails. So we persist them on the order
-- to support repeat "Pay Now" clicks and post-refresh redisplay.
-- ============================================================

alter table orders add column if not exists bachs_charge_id text;
alter table orders add column if not exists bank_account_number text;
alter table orders add column if not exists bank_account_name text;
alter table orders add column if not exists bank_name text;
alter table orders add column if not exists bank_transfer_expires_at timestamptz;

create index if not exists idx_orders_bachs_charge on orders(bachs_charge_id)
  where bachs_charge_id is not null;
