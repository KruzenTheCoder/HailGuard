-- HailGuard — categorise zones by province
--
-- Adds a province to zones so the dashboard can group coverage by province.
-- Existing seeded zones are the Johannesburg metro -> Gauteng.

alter table public.zones add column if not exists province text;

update public.zones set province = 'Gauteng' where province is null;
