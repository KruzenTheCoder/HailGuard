-- HailGuard — reviewer recommendation pipeline
--
-- Reviewers (permission application:review) record a NON-binding recommendation
-- (approve/reject) on a driver profile or vehicle. Compliance admins
-- (application:approve) see the recommendation and make the final call via the
-- existing approve/reject actions. One current recommendation per entity.

create table if not exists public.application_recommendations (
  id             uuid primary key default gen_random_uuid(),
  entity_type    text not null check (entity_type in ('driver_profile', 'vehicle')),
  entity_id      uuid not null,
  recommendation text not null check (recommendation in ('approve', 'reject')),
  note           text,
  reviewer_id    uuid references public.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create trigger application_recommendations_set_updated_at
  before update on public.application_recommendations
  for each row execute function public.set_updated_at();

alter table public.application_recommendations enable row level security;

-- Any backoffice staff can read recommendations.
create policy "recommendations: staff read"
  on public.application_recommendations for select to authenticated
  using (public.is_admin());

-- Only holders of application:review can write a recommendation.
create policy "recommendations: reviewer insert"
  on public.application_recommendations for insert to authenticated
  with check (public.has_permission('application:review'));

create policy "recommendations: reviewer update"
  on public.application_recommendations for update to authenticated
  using (public.has_permission('application:review'))
  with check (public.has_permission('application:review'));
