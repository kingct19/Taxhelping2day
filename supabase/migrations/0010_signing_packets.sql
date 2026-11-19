create table public.signing_packets (
 id uuid primary key default gen_random_uuid(),
 return_id uuid not null references public.tax_returns(id),
 template_id integer not null,
 recipient text not null,
 submission_id bigint unique,
 status text not null default 'creating',
 signer_states jsonb not null default '[]',
 files jsonb not null default '[]',
 unique(return_id,template_id)
);
alter table public.signing_packets enable row level security;
revoke all on public.signing_packets from anon, authenticated;
grant select,insert,update on public.signing_packets to service_role;
