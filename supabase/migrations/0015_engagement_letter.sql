alter table public.signing_templates
  add column if not exists kind text;

alter table public.signing_packets
  add column if not exists sign_url text;
