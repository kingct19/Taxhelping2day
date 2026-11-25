alter table public.profiles
  add column if not exists staff_rank text not null default 'staff' check (staff_rank in ('owner', 'staff')),
  add column if not exists staff_status text not null default 'active' check (staff_status in ('active', 'inactive'));

update public.profiles
set staff_rank = 'owner'
where role = 'staff'
  and lower(email) in ('taxhelping2day@gmail.com', 'kingchandler19@gmail.com');
