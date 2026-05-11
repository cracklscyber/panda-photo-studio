-- Romy customer accounts. One row per browser session.
-- Created anonymously on first chat interaction; auth fields filled in after sign-in.

create table if not exists public.romy_customers (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  email text,
  name text,
  provider text,
  auth_user_id uuid,
  first_build_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists romy_customers_email_idx on public.romy_customers (email)
  where email is not null;
create index if not exists romy_customers_auth_user_id_idx on public.romy_customers (auth_user_id)
  where auth_user_id is not null;

alter table public.romy_customers enable row level security;
