-- ============================================================
-- tagly credit consent migration (credit score page)
-- Run this in the Supabase SQL editor.
-- ============================================================

alter table businesses
  add column if not exists credit_consent boolean default true;
