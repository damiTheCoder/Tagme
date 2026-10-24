-- Founder admin panel (migration 12).
-- Run once in the Supabase SQL editor.

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_admin_audit_log_admin
  on admin_audit_log(admin_user_id, created_at desc);
create index if not exists idx_admin_audit_log_target
  on admin_audit_log(target_type, target_id);

-- No RLS on admin_audit_log: service-role access only. Do not add policies.

alter table businesses add column if not exists suspended_at timestamptz;
alter table businesses add column if not exists deleted_at timestamptz;
