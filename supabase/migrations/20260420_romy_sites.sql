-- Romy website-feature MVP: new tables to replace luna_websites / luna_conversations.
-- One row per WhatsApp customer (keyed by phone), with slug for file-storage path.

create table if not exists public.romy_sites (
  phone text primary key,
  slug text not null unique,
  business_name text,
  last_sandbox_id text,
  custom_domain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists romy_sites_slug_idx on public.romy_sites (slug);
create index if not exists romy_sites_custom_domain_idx on public.romy_sites (custom_domain)
  where custom_domain is not null;

create table if not exists public.romy_conversations (
  phone text primary key,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Service role only — no RLS policies needed since only the webhook (server) reads/writes.
alter table public.romy_sites enable row level security;
alter table public.romy_conversations enable row level security;
