alter table public.profiles
  add column if not exists starred boolean not null default false,
  add column if not exists snoozed_until timestamptz;
