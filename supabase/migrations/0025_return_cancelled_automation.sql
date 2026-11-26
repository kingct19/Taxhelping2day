alter table public.automations drop constraint if exists automations_event_check;
alter table public.automations drop constraint if exists automations_move_to_stage_check;

alter table public.automations
  add constraint automations_event_check
    check (event is null or event in ('invited', 'accepted', 'profile_complete', 'documents_ready', 'efile_signed', 'filing_accepted', 'return_cancelled')),
  add constraint automations_move_to_stage_check
    check (move_to_stage is null or move_to_stage in ('lead', 'onboarding', 'documents', 'preparation', 'review', 'approval', 'filing', 'delivery', 'renewal', 'canceled'));

insert into public.automations (id, name, enabled, trigger_kind, event, stage, after_days, move_to_stage, email_subject, email_body, position)
values
  ('a1000000-0000-4000-8000-000000000009', 'Return cancelled', true, 'event', 'return_cancelled', null, null, 'canceled', null, null, 8)
on conflict (id) do nothing;
