alter table public.tax_returns
  add column if not exists waiting_on text,
  add column if not exists source text not null default 'inquiry',
  add column if not exists services text[] not null default '{}',
  add column if not exists reviewer_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists archived_at timestamptz;

do $$
declare constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'tax_returns'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%stage%'
  loop
    execute format('alter table public.tax_returns drop constraint %I', constraint_name);
  end loop;
end $$;

update public.tax_returns set
  waiting_on = case
    when stage = 'intake' then 'staff'
    when stage = 'waiting' then 'client'
    else waiting_on
  end,
  stage = case
    when stage = 'intake' then 'documents'
    when stage = 'waiting' then case
      when resume_stage in ('preparation', 'review') then resume_stage
      when resume_stage = 'followup' then 'filing'
      when resume_stage = 'closed' then 'delivery'
      else 'documents'
    end
    when stage = 'followup' then 'filing'
    when stage = 'closed' then 'delivery'
    else stage
  end;

alter table public.tax_returns drop column if exists resume_stage;

alter table public.tax_returns
  add constraint tax_returns_stage_check
    check (stage in ('lead','onboarding','documents','preparation','review','approval','filing','delivery','renewal')),
  add constraint tax_returns_waiting_on_check
    check (waiting_on is null or waiting_on in ('client','staff')),
  add constraint tax_returns_source_check
    check (source in ('inquiry','referral','returning')),
  add constraint tax_returns_services_check
    check (services <@ array['tax_return','bookkeeping','payroll','estimates','planning']::text[]);

alter table public.tax_returns alter column stage set default 'lead';

grant update (waiting_on, source, services, reviewer_id, reviewed_at, delivered_at, archived_at)
  on public.tax_returns to service_role;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null unique references public.tax_returns(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null check (status in ('draft','sent','paid','waived')),
  instructions text not null default '' check (length(instructions) <= 1000),
  updated_at timestamptz not null default now()
);

alter table public.invoices enable row level security;
revoke all on public.invoices from anon, authenticated;
grant select, insert, update, delete on public.invoices to service_role;
