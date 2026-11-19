create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  channel text not null check (channel in ('chat', 'email', 'phone')),
  status text not null check (status in ('open', 'snoozed', 'closed')),
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high', 'urgent')),
  assignee_id uuid references public.profiles(id),
  team_inbox text check (team_inbox in ('prep', 'review', 'client-care')),
  tags text[] not null default '{}',
  unread_count integer not null default 0,
  starred boolean not null default false,
  mentioned boolean not null default false,
  created_by_me boolean not null default false,
  is_spam boolean not null default false,
  suggestions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists delivery text check (delivery in ('sent', 'seen', 'not-seen')),
  add column if not exists attachments jsonb not null default '[]';

insert into public.conversations (profile_id, subject, channel, status, priority, starred, suggestions)
select
  p.id,
  case when p.name <> '' then p.name else p.email end,
  'chat',
  case when p.snoozed_until is not null and p.snoozed_until > now() then 'snoozed' else 'open' end,
  'none',
  coalesce(p.starred, false),
  array[
    'Could you send the documents still open on this file?',
    'I will review this and write back shortly.'
  ]
from public.profiles p
where p.role = 'client'
  and not exists (select 1 from public.conversations c where c.profile_id = p.id);

update public.messages m
set conversation_id = (
  select c.id from public.conversations c
  where c.profile_id = m.profile_id
  order by c.created_at
  limit 1
)
where m.conversation_id is null;

alter table public.conversations enable row level security;

create policy "staff or own conversations" on public.conversations
  for select using (public.is_staff() or auth.uid() = profile_id);
