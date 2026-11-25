create table if not exists public.filing_catalog (
  id text primary key,
  catalog jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.filing_catalog enable row level security;
revoke all on public.filing_catalog from anon, authenticated;
grant select, insert, update on public.filing_catalog to service_role;

alter table public.tax_returns add column if not exists filing_type_id text;

drop index if exists public.tax_returns_identity;
create unique index tax_returns_identity on public.tax_returns
  (profile_id, tax_year, coalesce(filing_type_id, taxpayer_type), lower(trim(entity)));
