update public.messages set request_state = 'responded' where request_state = 'received';

alter table public.messages drop constraint if exists messages_request_state_check;
alter table public.messages drop constraint if exists request_transition;

alter table public.messages
  add constraint messages_request_state_check
  check (request_state is null or request_state in ('open','responded','unavailable','replacement','accepted','waived'));

alter table public.messages
  add column request_block text check (request_block is null or request_block in ('start','filing','info'));

alter table public.messages add constraint request_transition check (
  (request_state is null and previous_id is null) or
  (request_state is not null and return_id is not null and kind <> 'note' and
   ((request_state = 'open') = (previous_id is null)))
);

alter table public.tax_returns
  add column resume_stage text check (resume_stage is null or resume_stage in ('intake','waiting','preparation','review','followup','closed')),
  add column return_version integer not null default 1 check (return_version > 0);

grant update (resume_stage, return_version) on public.tax_returns to service_role;

create table public.filing_ledgers (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.tax_returns(id) on delete cascade,
  jurisdiction text not null check (jurisdiction in ('federal','state')),
  region text not null default '',
  status text not null check (status in ('draft','changes','signature','transmitted','accepted','rejected')),
  note text not null default '' check (length(note) <= 1000),
  updated_at timestamptz not null default now(),
  unique (return_id, jurisdiction, region)
);

create table public.efile_authorizations (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.tax_returns(id) on delete cascade,
  signer text not null check (signer in ('taxpayer','spouse')),
  return_version integer not null check (return_version > 0),
  method text check (method is null or method in ('manual','attested')),
  status text not null check (status in ('needed','signed')),
  signed_at timestamptz,
  evidence text not null default '' check (length(evidence) <= 1000),
  unique (return_id, signer, return_version)
);

alter table public.filing_ledgers enable row level security;
alter table public.efile_authorizations enable row level security;
revoke all on public.filing_ledgers from anon, authenticated;
revoke all on public.efile_authorizations from anon, authenticated;
grant select, insert, update, delete on public.filing_ledgers to service_role;
grant select, insert, update, delete on public.efile_authorizations to service_role;
