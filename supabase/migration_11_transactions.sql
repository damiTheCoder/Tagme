-- ============================================================
-- tagly transactions ledger migration (settled money movement)
-- Run this in the Supabase SQL editor.
-- Orders are promises; transactions are money that actually moved.
-- The credit score is computed from SETTLED transactions only.
-- ============================================================

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount >= 0),
  currency text not null default 'NGN',
  source text not null,
  category text,
  description text,
  reference text,
  status text not null default 'settled' check (status in ('pending', 'settled', 'failed', 'refunded')),
  settled_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_transactions_business
  on transactions(business_id, settled_at desc);
create index if not exists idx_transactions_type_status
  on transactions(business_id, type, status);
create index if not exists idx_transactions_reference
  on transactions(reference) where reference is not null;

alter table transactions enable row level security;

drop policy if exists "owner manages own transactions" on transactions;
create policy "owner manages own transactions" on transactions
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
