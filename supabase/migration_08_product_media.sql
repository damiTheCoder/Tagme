-- ============================================================
-- tagly product media migration (Step 13)
-- Run this in the Supabase SQL editor AFTER migration_07.
-- Adds public IDs + image URLs, backfills IDs, opens the
-- product-images storage bucket.
-- ============================================================

alter table products
  add column if not exists public_id text,
  add column if not exists image_url text;

-- Backfill sequential IDs per business: 1st product = PRD-001, etc.
do $$
declare
  b record;
  p record;
  counter int;
begin
  for b in select id from businesses loop
    counter := 0;
    for p in
      select id from products
      where business_id = b.id and public_id is null
      order by created_at
    loop
      counter := counter + 1;
      update products
        set public_id = 'PRD-' || lpad(counter::text, 3, '0')
        where id = p.id;
    end loop;
  end loop;
end $$;

create unique index if not exists idx_products_business_public_id
  on products(business_id, public_id);

-- Public bucket for product images (path: {business_id}/{product_id}.{ext}).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read so images render in customer chat.
drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Owners manage only their own business folder.
drop policy if exists "Owners manage own product images" on storage.objects;
create policy "Owners manage own product images"
  on storage.objects for all
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from businesses where owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from businesses where owner_id = auth.uid()
    )
  );
