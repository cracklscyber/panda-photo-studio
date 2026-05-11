-- Keep local migrations in sync with the production Romy schema.

alter table public.romy_sites
  add column if not exists builds_used integer not null default 0,
  add column if not exists paid boolean not null default false,
  add column if not exists callback_requested_at timestamptz;

alter table public.romy_customers
  add column if not exists stripe_customer_id text;

create index if not exists romy_customers_stripe_customer_id_idx
  on public.romy_customers (stripe_customer_id)
  where stripe_customer_id is not null;
