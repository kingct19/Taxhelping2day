alter table public.tax_returns
  add column if not exists desk jsonb not null default '{}'::jsonb;

grant update (desk) on public.tax_returns to service_role;
