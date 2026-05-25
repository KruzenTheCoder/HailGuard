-- HailGuard — assign applications to reviewers
--
-- Compliance admins / super admins assign a pending application (driver profile
-- or vehicle) to a reviewer. Reviewers then see ONLY what's assigned to them
-- (enforced in the app queries + page guards). One assignment per entity.

insert into public.permissions (key, description) values
  ('application:assign', 'Assign applications to reviewers')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key) values
  ('super_admin', 'application:assign'),
  ('admin', 'application:assign'),
  ('compliance_admin', 'application:assign')
on conflict do nothing;

create table if not exists public.application_assignments (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('driver_profile', 'vehicle')),
  entity_id    uuid not null,
  reviewer_id  uuid not null references public.users (id) on delete cascade,
  assigned_by  uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (entity_type, entity_id)
);
create index if not exists application_assignments_reviewer_idx
  on public.application_assignments (reviewer_id);

create trigger application_assignments_set_updated_at
  before update on public.application_assignments
  for each row execute function public.set_updated_at();

alter table public.application_assignments enable row level security;

-- All staff can read assignments (reviewers need to see their own).
create policy "assignments: staff read"
  on public.application_assignments for select to authenticated
  using (public.is_admin());

-- Only assigners (application:assign) can create/update/remove assignments.
create policy "assignments: assigner write"
  on public.application_assignments for all to authenticated
  using (public.has_permission('application:assign'))
  with check (public.has_permission('application:assign'));
