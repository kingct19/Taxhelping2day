create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('client', 'staff')),
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  taxpayer_type text not null default 'individual' check (taxpayer_type in ('individual', 'business', 'nonprofit')),
  tax_id_encrypted text,
  tax_id_last4 text,
  spouse_name text not null default '',
  tax_years text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  filename text not null,
  content_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('engagement', 'poa')),
  signed_at timestamptz not null default now(),
  ip text not null,
  user_agent text not null,
  storage_path text not null
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  author_role text not null,
  body text not null,
  kind text not null check (kind in ('message', 'event')),
  created_at timestamptz not null default now()
);

create table if not exists public.magic_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.identity_notes (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  attested boolean not null default false,
  note text not null default '',
  attested_at timestamptz,
  attested_by uuid references public.profiles(id)
);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.signatures enable row level security;
alter table public.messages enable row level security;
alter table public.magic_tokens enable row level security;
alter table public.identity_notes enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'staff'
  );
$$;

create policy "own profile" on public.profiles
  for select using (auth.uid() = id or public.is_staff());

create policy "own documents" on public.documents
  for select using (auth.uid() = profile_id or public.is_staff());

create policy "own signatures" on public.signatures
  for select using (auth.uid() = profile_id or public.is_staff());

create policy "own messages" on public.messages
  for select using (auth.uid() = profile_id or public.is_staff());

insert into storage.buckets (id, name, public)
values ('portal-files', 'portal-files', false)
on conflict (id) do nothing;
