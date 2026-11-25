create table if not exists public.office_hours (
  id text primary key,
  hours jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.office_hours enable row level security;
revoke all on public.office_hours from anon, authenticated;
grant select, insert, update on public.office_hours to service_role;
