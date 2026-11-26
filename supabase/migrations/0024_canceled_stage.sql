alter table public.tax_returns drop constraint if exists tax_returns_stage_check;

alter table public.tax_returns
  add constraint tax_returns_stage_check
    check (stage in ('lead','onboarding','documents','preparation','review','approval','filing','delivery','renewal','canceled'));
