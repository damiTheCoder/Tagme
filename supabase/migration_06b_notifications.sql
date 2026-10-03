-- ============================================================
-- Step 6b (F) — email notification preferences
-- Run this in Supabase SQL editor.
-- notification_email already exists on older setups; both
-- statements are defensive (IF NOT EXISTS) and safe to re-run.
-- Until this runs, order emails are skipped gracefully and
-- orders are unaffected.
-- ============================================================

alter table businesses add column if not exists notification_enabled boolean default true;
alter table businesses add column if not exists notification_email text;
