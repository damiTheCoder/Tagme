-- ============================================================
-- tagly inventory migration (Step 10)
-- Run this in the Supabase SQL editor AFTER schema.sql.
-- Adds stock tracking + AI details to products.
-- ============================================================

alter table products
  add column if not exists stock_count integer default 0,
  add column if not exists low_stock_threshold integer default 3,
  add column if not exists details text;

-- Backfill: products marked in stock start at 100, others at 0.
-- Only touches rows still at the default (safe to re-run).
update products
  set stock_count = case when in_stock = true then 100 else 0 end
  where stock_count = 0;

create index if not exists idx_products_business_stock
  on products(business_id, stock_count);

-- Step 11 perf: composite + missing lookups (all IF NOT EXISTS, safe).
create index if not exists idx_orders_business_created
  on orders(business_id, created_at desc);
create index if not exists idx_customers_business
  on customers(business_id);
