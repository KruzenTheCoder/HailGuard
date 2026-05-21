-- HailGuard — Row Level Security
--
-- Drivers may only read/write their own records; admins may do everything.
-- Sensitive state transitions (review status, role, subscription activation,
-- payment records) are reserved for admins or the service role, enforced via
-- a mix of policies and guard triggers.

-- ---------------------------------------------------------------------------
-- Ownership helpers (SECURITY DEFINER to avoid recursive RLS evaluation)
-- ---------------------------------------------------------------------------
create or replace function public.current_driver_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.driver_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.owns_vehicle(v_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vehicles
    where id = v_id and driver_id = public.current_driver_profile_id()
  );
$$;

create or replace function public.owns_subscription(s_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.vehicles v on v.id = s.vehicle_id
    where s.id = s_id and v.driver_id = public.current_driver_profile_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- Guard triggers for privileged columns
-- ---------------------------------------------------------------------------
-- Non-admins cannot self-approve or write review notes. They may reset their
-- own status to 'pending' (e.g. resubmitting documents after a rejection).
create or replace function public.guard_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.review_note is distinct from old.review_note then
    raise exception 'Only admins can modify review notes';
  end if;
  if new.status is distinct from old.status and new.status::text <> 'pending' then
    raise exception 'Only admins can change review status';
  end if;
  return new;
end;
$$;

create trigger driver_profiles_guard_review
  before update on public.driver_profiles
  for each row execute function public.guard_review_fields();

create trigger vehicles_guard_review
  before update on public.vehicles
  for each row execute function public.guard_review_fields();

-- Only admins may change a user's role.
create or replace function public.guard_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change user role';
  end if;
  return new;
end;
$$;

create trigger users_guard_role
  before update on public.users
  for each row execute function public.guard_user_role();

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.users           enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.vehicles        enable row level security;
alter table public.zones           enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.payments        enable row level security;
alter table public.audit_logs      enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create policy "users: read own or admin"
  on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "users: update own or admin"
  on public.users for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- (Role changes are blocked for non-admins by users_guard_role trigger.)
-- (Inserts happen via the handle_new_user SECURITY DEFINER trigger.)

-- ---------------------------------------------------------------------------
-- driver_profiles
-- ---------------------------------------------------------------------------
create policy "driver_profiles: read own or admin"
  on public.driver_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "driver_profiles: insert own"
  on public.driver_profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "driver_profiles: update own or admin"
  on public.driver_profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
-- (Status/review_note changes are restricted by guard_review_fields trigger.)

create policy "driver_profiles: delete own or admin"
  on public.driver_profiles for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------
create policy "vehicles: read own or admin"
  on public.vehicles for select to authenticated
  using (driver_id = public.current_driver_profile_id() or public.is_admin());

create policy "vehicles: insert own"
  on public.vehicles for insert to authenticated
  with check (driver_id = public.current_driver_profile_id());

create policy "vehicles: update own or admin"
  on public.vehicles for update to authenticated
  using (driver_id = public.current_driver_profile_id() or public.is_admin())
  with check (driver_id = public.current_driver_profile_id() or public.is_admin());

create policy "vehicles: delete own or admin"
  on public.vehicles for delete to authenticated
  using (driver_id = public.current_driver_profile_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- zones (drivers browse active zones; admins manage all)
-- ---------------------------------------------------------------------------
create policy "zones: read active or admin"
  on public.zones for select to authenticated
  using (is_active or public.is_admin());

create policy "zones: admin write"
  on public.zones for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- subscriptions (owner reads + creates; activation is admin/service-role only)
-- ---------------------------------------------------------------------------
create policy "subscriptions: read own or admin"
  on public.subscriptions for select to authenticated
  using (public.owns_vehicle(vehicle_id) or public.is_admin());

create policy "subscriptions: insert own"
  on public.subscriptions for insert to authenticated
  with check (public.owns_vehicle(vehicle_id));

create policy "subscriptions: admin update"
  on public.subscriptions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "subscriptions: admin delete"
  on public.subscriptions for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- payments (owner reads; writes are admin/service-role only)
-- ---------------------------------------------------------------------------
create policy "payments: read own or admin"
  on public.payments for select to authenticated
  using (public.owns_subscription(subscription_id) or public.is_admin());

create policy "payments: admin write"
  on public.payments for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_logs (admin read; writes via service role / admin)
-- ---------------------------------------------------------------------------
create policy "audit_logs: admin read"
  on public.audit_logs for select to authenticated
  using (public.is_admin());

create policy "audit_logs: admin write"
  on public.audit_logs for insert to authenticated
  with check (public.is_admin());
