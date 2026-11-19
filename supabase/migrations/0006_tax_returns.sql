create table public.tax_returns (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tax_year integer not null check (tax_year between 1900 and 9999),
  entity text not null check (length(trim(entity)) between 1 and 150),
  taxpayer_type text not null check (taxpayer_type in ('individual','business','nonprofit'))
);

create unique index tax_returns_identity on public.tax_returns
  (profile_id, tax_year, taxpayer_type, lower(trim(entity)));

alter table public.tax_returns enable row level security;
-- Portal reads and staff writes pass through the authenticated server store.
revoke all on public.tax_returns from anon, authenticated;
grant select, insert on public.tax_returns to service_role;
