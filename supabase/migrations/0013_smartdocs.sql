create table public.signing_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  docuseal_template_id integer unique,
  signer_role text not null default 'First Party',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.signing_templates enable row level security;
revoke all on public.signing_templates from anon, authenticated;
grant select, insert, update on public.signing_templates to service_role;

alter table public.signing_packets drop constraint if exists signing_packets_return_id_template_id_key;

alter table public.signing_packets
  add column if not exists template_ref uuid references public.signing_templates(id),
  add column if not exists sent_at timestamptz not null default now();

create index if not exists signing_packets_template_ref_idx on public.signing_packets (template_ref);
