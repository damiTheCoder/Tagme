-- Migration 16: WhatsApp Embedded Signup fields
alter table businesses
  add column if not exists whatsapp_phone_number_id text,
  add column if not exists whatsapp_business_account_id text,
  add column if not exists whatsapp_access_token text;

create index if not exists idx_businesses_whatsapp_phone on businesses(whatsapp_phone_number_id);