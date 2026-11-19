alter table public.messages
  add column request_state text check (request_state in ('open','received','accepted','replacement')),
  add column previous_id uuid unique references public.messages(id);
alter table public.messages add constraint request_transition check (
  (request_state is null and previous_id is null) or
  (request_state is not null and return_id is not null and kind <> 'note' and
   ((request_state = 'open') = (previous_id is null)))
);
