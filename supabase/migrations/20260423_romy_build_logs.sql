-- Per-build cost log so we can see which customer spends what.
-- Append-only; one row per completed (or failed) Romy build.

create table if not exists public.romy_build_logs (
  id bigserial primary key,
  phone text not null,
  slug text,
  ok boolean not null,
  cost_usd numeric(10, 6),
  duration_ms integer,
  was_warm boolean,
  user_message text,
  created_at timestamptz not null default now()
);

create index if not exists romy_build_logs_phone_created_idx
  on public.romy_build_logs (phone, created_at desc);

alter table public.romy_build_logs enable row level security;
