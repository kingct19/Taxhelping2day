alter table public.messages drop constraint if exists messages_kind_check;

alter table public.messages
  add constraint messages_kind_check check (kind in ('message', 'event', 'note'));
