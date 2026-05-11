-- Prevent one Supabase auth user from being attached to multiple Romy sessions.

create unique index if not exists romy_customers_auth_user_id_unique_idx
  on public.romy_customers (auth_user_id)
  where auth_user_id is not null;
