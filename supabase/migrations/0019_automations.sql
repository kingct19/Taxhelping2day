alter table public.profiles
  add column if not exists portal_accepted_at timestamptz;

grant update (portal_accepted_at) on public.profiles to service_role;

alter table public.tax_returns
  add column if not exists stage_entered_at timestamptz not null default now();

grant update (stage_entered_at) on public.tax_returns to service_role;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create unique index if not exists tags_name_lower on public.tags (lower(btrim(name)));

create table if not exists public.return_tags (
  return_id uuid not null references public.tax_returns(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (return_id, tag_id)
);

create table if not exists public.automations (
  id uuid primary key,
  name text not null check (length(btrim(name)) between 1 and 80),
  enabled boolean not null default true,
  trigger_kind text not null check (trigger_kind in ('event', 'entered_stage', 'stage_age', 'tag_added', 'tag_removed')),
  event text check (event is null or event in ('invited', 'accepted', 'profile_complete', 'documents_ready', 'efile_signed', 'filing_accepted')),
  stage text check (stage is null or stage in ('lead', 'onboarding', 'documents', 'preparation', 'review', 'approval', 'filing', 'delivery', 'renewal')),
  after_days integer check (after_days is null or (after_days >= 0 and after_days <= 365)),
  tag_id uuid references public.tags(id) on delete restrict,
  condition_tag_id uuid references public.tags(id) on delete restrict,
  condition_mode text check (condition_mode is null or condition_mode in ('has', 'missing')),
  move_to_stage text check (move_to_stage is null or move_to_stage in ('lead', 'onboarding', 'documents', 'preparation', 'review', 'approval', 'filing', 'delivery', 'renewal')),
  email_subject text check (email_subject is null or length(email_subject) <= 200),
  email_body text check (email_body is null or length(email_body) <= 2000),
  add_tag_id uuid references public.tags(id) on delete restrict,
  remove_tag_id uuid references public.tags(id) on delete restrict,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_fires (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  return_id uuid not null references public.tax_returns(id) on delete cascade,
  trigger_key text not null check (length(trigger_key) between 1 and 200),
  fired_at timestamptz not null default now(),
  unique (automation_id, return_id, trigger_key)
);

alter table public.tags enable row level security;
alter table public.return_tags enable row level security;
alter table public.automations enable row level security;
alter table public.automation_fires enable row level security;

revoke all on public.tags from anon, authenticated;
revoke all on public.return_tags from anon, authenticated;
revoke all on public.automations from anon, authenticated;
revoke all on public.automation_fires from anon, authenticated;

grant select, insert, update, delete on public.tags to service_role;
grant select, insert, update, delete on public.return_tags to service_role;
grant select, insert, update, delete on public.automations to service_role;
grant select, insert, delete on public.automation_fires to service_role;

insert into public.automations (id, name, enabled, trigger_kind, event, stage, after_days, move_to_stage, email_subject, email_body, position)
values
  ('a1000000-0000-4000-8000-000000000001', 'Client invited', true, 'event', 'invited', null, null, 'lead', null, null, 0),
  ('a1000000-0000-4000-8000-000000000002', 'Invite accepted', true, 'event', 'accepted', null, null, 'onboarding', null, null, 1),
  ('a1000000-0000-4000-8000-000000000003', 'Basic information saved', true, 'event', 'profile_complete', null, null, 'documents', null, null, 2),
  ('a1000000-0000-4000-8000-000000000004', 'Documents ready', true, 'event', 'documents_ready', null, null, 'preparation', null, null, 3),
  ('a1000000-0000-4000-8000-000000000005', 'Form 8879 signed', false, 'event', 'efile_signed', null, null, 'filing', null, null, 4),
  ('a1000000-0000-4000-8000-000000000006', 'Filing accepted', false, 'event', 'filing_accepted', null, null, 'delivery', null, null, 5),
  ('a1000000-0000-4000-8000-000000000007', 'Documents still waiting', false, 'stage_age', null, 'documents', 7, null, 'Documents are still waiting', 'Hi {{client_name}}, a few documents are still waiting in your portal. Sign in when you can: {{portal_link}}', 6),
  ('a1000000-0000-4000-8000-000000000008', 'Lead check-in', false, 'stage_age', null, 'lead', 3, null, 'We''re ready when you are', 'Hi {{client_name}}, {{firm_name}} invited you to the portal. Sign in to get started: {{portal_link}}', 7)
on conflict (id) do nothing;
