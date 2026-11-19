create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('invite', 'kickoff', 'review')),
  status text not null default 'open' check (status in ('open', 'done')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, kind)
);

alter table public.tasks enable row level security;

create policy "staff tasks" on public.tasks
  for all using (public.is_staff()) with check (public.is_staff());
