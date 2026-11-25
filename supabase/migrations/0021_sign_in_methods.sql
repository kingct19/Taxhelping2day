create table if not exists public.sign_in_methods (
  id text primary key,
  methods jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.sign_in_methods enable row level security;
revoke all on public.sign_in_methods from anon, authenticated;
grant select, insert, update on public.sign_in_methods to service_role;
