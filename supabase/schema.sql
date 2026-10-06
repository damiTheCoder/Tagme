-- ============================================================
-- tagly schema
-- Run this in Supabase SQL editor.
--
-- NOTE: The public chat page (/b/[slug]) and the AI agent will
-- use the SERVICE ROLE KEY on the server, bypassing RLS.
-- The owner dashboard uses the authenticated user session,
-- so RLS policies apply there.
-- ============================================================

-- Businesses
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  hours text,
  policies text,
  notification_email text,
  currency text default 'USD',
  created_at timestamptz default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null default 0,
  in_stock boolean default true,
  created_at timestamptz default now()
);

-- Customers
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text,
  phone text,
  email text,
  created_at timestamptz default now()
);

-- Conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  status text default 'active',
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  customer_id uuid references customers(id),
  conversation_id uuid references conversations(id),
  items jsonb not null,
  total numeric not null default 0,
  currency text default 'USD',
  status text default 'pending',
  owner_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_products_business on products(business_id);
create index if not exists idx_conversations_business on conversations(business_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_orders_business on orders(business_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_businesses_slug on businesses(slug);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table businesses enable row level security;
create policy "owner reads own business" on businesses
  for select using (owner_id = auth.uid());
create policy "owner updates own business" on businesses
  for update using (owner_id = auth.uid());
create policy "owner inserts own business" on businesses
  for insert with check (owner_id = auth.uid());

alter table products enable row level security;
create policy "owner manages own products" on products
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table orders enable row level security;
create policy "owner reads own orders" on orders
  for select using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
create policy "owner updates own orders" on orders
  for update using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table customers enable row level security;
create policy "owner manages own customers" on customers
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table conversations enable row level security;
create policy "owner manages own conversations" on conversations
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table messages enable row level security;
create policy "owner manages own messages" on messages
  for all using (
    conversation_id in (
      select c.id from conversations c
      join businesses b on b.id = c.business_id
      where b.owner_id = auth.uid()
    )
  );
