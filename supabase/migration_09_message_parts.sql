-- ============================================================
-- tagly message parts migration (carousel persistence fix)
-- Run this in the Supabase SQL editor.
-- Stores assistant tool results so rich content (e.g. the
-- product carousel) survives a page refresh.
-- ============================================================

alter table messages
  add column if not exists parts jsonb;
