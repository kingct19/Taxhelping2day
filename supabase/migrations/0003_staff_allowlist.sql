create table if not exists public.staff_allowlist (
  email text primary key
);

alter table public.staff_allowlist enable row level security;
