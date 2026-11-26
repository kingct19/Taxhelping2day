alter table public.documents
  add column if not exists return_id uuid references public.tax_returns(id) on delete set null;

create index if not exists documents_return_id_idx on public.documents (return_id);
