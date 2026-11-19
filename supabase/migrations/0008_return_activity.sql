alter table public.messages
  add column return_id uuid references public.tax_returns(id),
  add column document_id uuid references public.documents(id),
  add column signature_id uuid references public.signatures(id);
create index messages_return_activity on public.messages(return_id, created_at);
drop policy "own messages" on public.messages;
create policy "own messages" on public.messages for select using (
  public.is_staff() or (auth.uid() = profile_id and kind <> 'note')
);
