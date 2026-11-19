alter table public.tax_returns
  add column stage text not null default 'intake'
    check (stage in ('intake','waiting','preparation','review','followup','closed')),
  add column owner_id uuid references public.profiles(id) on delete set null,
  add column due_date date,
  add column next_action text not null default '' check (length(next_action) <= 500),
  add column revision integer not null default 0;
grant update (stage, owner_id, due_date, next_action, revision)
  on public.tax_returns to service_role;
