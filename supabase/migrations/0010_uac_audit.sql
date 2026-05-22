-- HailGuard — Phase 8: UAC/RBAC, vehicle capacity matching, global audit
--
--  * Roles: super_admin, compliance_admin, reviewer (added to user_role)
--  * permissions + role_permissions matrix (+ has_permission helper)
--  * driver_profiles.prdp_status
--  * vehicles: vin_number, engine_number, passenger_capacity, vehicle_category
--  * zones.max_passenger_capacity + a subscription capacity-enforcement trigger
--  * audit_trails immutable global log + generic record_audit() trigger
--
-- NOTE: new enum values can't be USED as literals in the same transaction they
-- are added, so roles are compared/stored as TEXT throughout this migration.

-- ---------------------------------------------------------------------------
-- 1. Extend the role enum
-- ---------------------------------------------------------------------------
alter type public.user_role add value if not exists 'super_admin';
alter type public.user_role add value if not exists 'compliance_admin';
alter type public.user_role add value if not exists 'reviewer';

-- ---------------------------------------------------------------------------
-- 2. Role helpers (text comparisons — safe in this transaction)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.users where id = auth.uid();
$$;

-- All backoffice/staff roles get portal access + DB read/write via RLS. The
-- "reviewer can only recommend" limit is enforced in the app layer via
-- has_permission(); RLS-level granular enforcement is a hardening follow-up.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role::text in ('admin', 'super_admin', 'compliance_admin', 'reviewer')
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Permissions matrix (UAC)
-- ---------------------------------------------------------------------------
create table if not exists public.permissions (
  key         text primary key,
  description text not null
);

create table if not exists public.role_permissions (
  role           text not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role, permission_key)
);

insert into public.permissions (key, description) values
  ('user:read',           'View users and roles'),
  ('user:write',          'Create/edit users and assign roles'),
  ('application:review',  'Inspect and recommend on driver/vehicle applications'),
  ('application:approve', 'Final approve/reject applications'),
  ('zone:write',          'Create/edit zones and pricing'),
  ('subscription:write',  'Manage subscriptions/refunds/overrides'),
  ('incident:manage',     'Resolve incidents'),
  ('audit:read',          'View the system audit log'),
  ('system:config',       'Configure system settings')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key)
select 'super_admin', key from public.permissions
on conflict do nothing;

insert into public.role_permissions (role, permission_key) values
  ('compliance_admin', 'user:read'),
  ('compliance_admin', 'application:review'),
  ('compliance_admin', 'application:approve'),
  ('compliance_admin', 'zone:write'),
  ('compliance_admin', 'subscription:write'),
  ('compliance_admin', 'incident:manage'),
  ('compliance_admin', 'audit:read'),
  ('reviewer', 'user:read'),
  ('reviewer', 'application:review'),
  ('reviewer', 'audit:read')
on conflict do nothing;

-- Legacy 'admin' = full access (treat like super_admin) for backward compat.
insert into public.role_permissions (role, permission_key)
select 'admin', key from public.permissions
on conflict do nothing;

create or replace function public.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.role_permissions
    where role = public.current_user_role() and permission_key = p_key
  );
$$;

alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
create policy "permissions: staff read" on public.permissions
  for select to authenticated using (public.is_admin());
create policy "role_permissions: staff read" on public.role_permissions
  for select to authenticated using (public.is_admin());
create policy "role_permissions: super_admin write" on public.role_permissions
  for all to authenticated
  using (public.current_user_role() in ('super_admin', 'admin'))
  with check (public.current_user_role() in ('super_admin', 'admin'));

-- ---------------------------------------------------------------------------
-- 4. PrDP status + vehicle specifications + zone capacity
-- ---------------------------------------------------------------------------
alter table public.driver_profiles
  add column if not exists prdp_status text not null default 'pending';  -- pending | verified | expired

alter table public.vehicles
  add column if not exists vin_number         text,
  add column if not exists engine_number      text,
  add column if not exists passenger_capacity int,
  add column if not exists vehicle_category   text;  -- Hatchback | Sedan | 7-Seater/MPV | Minibus

alter table public.zones
  add column if not exists max_passenger_capacity int;  -- NULL = no restriction

-- Enforce zone passenger-capacity restrictions when a subscription is created.
create or replace function public.enforce_zone_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_cap int;
begin
  select max_passenger_capacity into v_max from public.zones where id = new.zone_id;
  select passenger_capacity into v_cap from public.vehicles where id = new.vehicle_id;
  if v_max is not null and v_cap is not null and v_cap > v_max then
    raise exception 'Vehicle capacity (%) exceeds the limit for this zone (max %). A commuter permit may be required.', v_cap, v_max;
  end if;
  return new;
end;
$$;

create trigger subscriptions_enforce_capacity
  before insert on public.subscriptions
  for each row execute function public.enforce_zone_capacity();

-- ---------------------------------------------------------------------------
-- 5. Global, immutable audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.audit_trails (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.users (id) on delete set null,
  actor_role   text,
  action_type  text not null,
  target_id    text,
  target_table text,
  old_data     jsonb,
  new_data     jsonb,
  ip_address   text,
  created_at   timestamptz not null default now()
);
create index if not exists audit_trails_created_idx on public.audit_trails (created_at desc);
create index if not exists audit_trails_actor_idx on public.audit_trails (actor_id);
create index if not exists audit_trails_action_idx on public.audit_trails (action_type);

alter table public.audit_trails enable row level security;
-- Read-only for staff; inserts only via the SECURITY DEFINER trigger. No
-- update/delete policies => immutable from the client.
create policy "audit_trails: staff read" on public.audit_trails
  for select to authenticated using (public.is_admin());

create or replace function public.record_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target text;
begin
  v_target := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, null);
  insert into public.audit_trails (actor_id, actor_role, action_type, target_id, target_table, old_data, new_data)
  values (
    auth.uid(),
    public.current_user_role(),
    tg_table_name || '.' || lower(tg_op),
    v_target,
    tg_table_name,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return null;  -- AFTER trigger
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['driver_profiles', 'vehicles', 'subscriptions', 'zones', 'users', 'incidents']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.record_audit()',
      t || '_audit', t
    );
  end loop;
end $$;
