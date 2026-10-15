-- Bachs payment integration (migration 13).
-- Run once in the Supabase SQL editor.

-- Extend businesses table for Bachs identifiers and subscription state
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bachs_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bachs_subaccount_id TEXT; -- For future Connect use
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive'; -- inactive, active, past_due, canceled
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_id TEXT; -- Bachs subscription ID
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Track customer orders paid via Bachs
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bachs_checkout_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'; -- unpaid, paid, failed
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_bachs_checkout ON orders(bachs_checkout_id);
CREATE INDEX IF NOT EXISTS idx_businesses_subscription ON businesses(subscription_status);

-- Free-tier order gating counters
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS orders_this_month int DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS orders_month_reset_at timestamptz DEFAULT now();
