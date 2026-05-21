-- HailGuard — Phase 7: Reporting & Regulatory Compliance
--
-- Adds:
--   * PrDP (Professional Driving Permit) fields on driver_profiles
--   * compliance_logs   — regulatory action trail (driver/vehicle-centric)
--   * incidents         — SOS / disputes / accidents / violations
--   * driver_shifts     — fatigue-management clock in/out
--   * run_compliance_sweep()  — auto-suspend expired roadworthy + expire subs
--   * revoke_compliance()     — one-click invalidation of a driver's passes
--
-- (audit_logs from 0001 stays the generic system trail; compliance_logs is the
--  domain/regulatory log the spec calls for.)

-- ---------------------------------------------------------------------------
-- PrDP on driver_profiles
-- ---------------------------------------------------------------------------
alter table public.driver_profiles
  add column if not exists prdp_number        text,
  add column if not exists prdp_document_path text,
  add column if not exists prdp_expires_at    date;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.incident_type as enum (
    'sos_triggered', 'passenger_dispute', 'accident', 'compliance_violation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_status as enum ('open', 'under_investigation', 'resolved');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- compliance_logs
-- ---------------------------------------------------------------------------
create table if not exists public.compliance_logs (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid references public.driver_profiles (id) on delete cascade,
  vehicle_id   uuid references public.vehicles (id) on delete set null,
  action_type  text not null,         -- document_verified | subscription_paid | vehicle_suspended | subscription_expired | compliance_revoked ...
  performed_by uuid references public.users (id) on delete set null,  -- NULL = system
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists compliance_logs_driver_idx on public.compliance_logs (driver_id, created_at desc);
create index if not exists compliance_logs_action_idx on public.compliance_logs (action_type);

-- ---------------------------------------------------------------------------
-- incidents
-- ---------------------------------------------------------------------------
create table if not exists public.incidents (
  id               uuid primary key default gen_random_uuid(),
  driver_id        uuid not null references public.driver_profiles (id) on delete cascade,
  vehicle_id       uuid references public.vehicles (id) on delete set null,
  incident_type    public.incident_type not null,
  status           public.incident_status not null default 'open',
  notes            text,                 -- driver-supplied context at report time
  resolution_notes text,                 -- admin investigation / resolution
  resolved_by      uuid references public.users (id) on delete set null,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists incidents_status_idx on public.incidents (status, created_at desc);
create index if not exists incidents_driver_idx on public.incidents (driver_id);

create trigger incidents_set_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- driver_shifts (fatigue management)
-- ---------------------------------------------------------------------------
create table if not exists public.driver_shifts (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.driver_profiles (id) on delete cascade,
  start_time  timestamptz not null default now(),
  end_time    timestamptz,
  total_hours numeric(6, 2),
  created_at  timestamptz not null default now()
);
create index if not exists driver_shifts_driver_idx on public.driver_shifts (driver_id, start_time desc);
-- At most one open (not-yet-clocked-out) shift per driver.
create unique index if not exists driver_shifts_one_open_per_driver
  on public.driver_shifts (driver_id) where end_time is null;

-- Compute total_hours when a shift is closed.
create or replace function public.set_shift_total_hours()
returns trigger
language plpgsql
as $$
begin
  if new.end_time is not null then
    new.total_hours := round(extract(epoch from (new.end_time - new.start_time)) / 3600.0, 2);
  end if;
  return new;
end;
$$;

create trigger driver_shifts_total_hours
  before insert or update on public.driver_shifts
  for each row execute function public.set_shift_total_hours();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.compliance_logs enable row level security;
alter table public.incidents       enable row level security;
alter table public.driver_shifts   enable row level security;

-- compliance_logs: own (driver) read, admin all; writes admin/system only.
create policy "compliance_logs: read own or admin"
  on public.compliance_logs for select to authenticated
  using (driver_id = public.current_driver_profile_id() or public.is_admin());
create policy "compliance_logs: admin insert"
  on public.compliance_logs for insert to authenticated
  with check (public.is_admin());

-- incidents: own read + insert (SOS); admin read + update (resolve).
create policy "incidents: read own or admin"
  on public.incidents for select to authenticated
  using (driver_id = public.current_driver_profile_id() or public.is_admin());
create policy "incidents: insert own or admin"
  on public.incidents for insert to authenticated
  with check (driver_id = public.current_driver_profile_id() or public.is_admin());
create policy "incidents: admin update"
  on public.incidents for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- driver_shifts: owner CRUD; admin read.
create policy "driver_shifts: read own or admin"
  on public.driver_shifts for select to authenticated
  using (driver_id = public.current_driver_profile_id() or public.is_admin());
create policy "driver_shifts: insert own"
  on public.driver_shifts for insert to authenticated
  with check (driver_id = public.current_driver_profile_id());
create policy "driver_shifts: update own"
  on public.driver_shifts for update to authenticated
  using (driver_id = public.current_driver_profile_id())
  with check (driver_id = public.current_driver_profile_id());

-- ---------------------------------------------------------------------------
-- Allow the system/service context (no auth.uid) to change review status.
-- The 0002 guard blocks any non-admin status change; the compliance sweep runs
-- as cron/service with no JWT, so treat a null auth.uid() as privileged. A
-- real driver always has auth.uid() set, so this never loosens their path.
-- ---------------------------------------------------------------------------
create or replace function public.guard_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
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

-- ---------------------------------------------------------------------------
-- run_compliance_sweep(): auto-suspend expired roadworthy + expire subscriptions.
-- Callable by an admin (manual button) or by pg_cron / service role (no JWT).
-- ---------------------------------------------------------------------------
create or replace function public.run_compliance_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suspended int := 0;
  v_expired   int := 0;
  r record;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can run the compliance sweep';
  end if;

  for r in
    update public.vehicles
       set status = 'suspended'
     where status = 'active'
       and roadworthy_expires_at is not null
       and roadworthy_expires_at < current_date
    returning id, driver_id, roadworthy_expires_at
  loop
    v_suspended := v_suspended + 1;
    insert into public.compliance_logs (driver_id, vehicle_id, action_type, performed_by, notes)
    values (r.driver_id, r.id, 'vehicle_suspended', null,
            'Auto-suspended: roadworthy expired ' || r.roadworthy_expires_at::text);
  end loop;

  for r in
    update public.subscriptions
       set status = 'expired'
     where status = 'active'
       and end_date is not null
       and end_date < current_date
    returning id, vehicle_id, end_date
  loop
    v_expired := v_expired + 1;
    insert into public.compliance_logs (driver_id, vehicle_id, action_type, performed_by, notes)
    select v.driver_id, v.id, 'subscription_expired', null,
           'Auto-expired: subscription ended ' || r.end_date::text
      from public.vehicles v where v.id = r.vehicle_id;
  end loop;

  return jsonb_build_object('vehiclesSuspended', v_suspended, 'subscriptionsExpired', v_expired);
end;
$$;
grant execute on function public.run_compliance_sweep() to authenticated;

-- ---------------------------------------------------------------------------
-- revoke_compliance(): one-click invalidation — cancel active subscriptions and
-- suspend active vehicles for a driver. The online verify page reflects this
-- immediately (offline signed tokens lapse at their own expiry).
-- ---------------------------------------------------------------------------
create or replace function public.revoke_compliance(p_driver_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subs int := 0;
  v_veh  int := 0;
  r record;
begin
  if not public.is_admin() then
    raise exception 'Only admins can revoke compliance';
  end if;

  for r in
    update public.subscriptions s
       set status = 'cancelled'
     where s.status = 'active'
       and s.vehicle_id in (select id from public.vehicles where driver_id = p_driver_id)
    returning s.id, s.vehicle_id
  loop
    v_subs := v_subs + 1;
    insert into public.compliance_logs (driver_id, vehicle_id, action_type, performed_by, notes)
    values (p_driver_id, r.vehicle_id, 'compliance_revoked', auth.uid(), 'Subscription cancelled via revoke');
  end loop;

  for r in
    update public.vehicles
       set status = 'suspended'
     where status = 'active' and driver_id = p_driver_id
    returning id
  loop
    v_veh := v_veh + 1;
    insert into public.compliance_logs (driver_id, vehicle_id, action_type, performed_by, notes)
    values (p_driver_id, r.id, 'vehicle_suspended', auth.uid(), 'Suspended via revoke compliance');
  end loop;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, detail)
  values (auth.uid(), 'compliance.revoke', 'driver_profile', p_driver_id,
          jsonb_build_object('subscriptionsCancelled', v_subs, 'vehiclesSuspended', v_veh));

  return jsonb_build_object('subscriptionsCancelled', v_subs, 'vehiclesSuspended', v_veh);
end;
$$;
grant execute on function public.revoke_compliance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Optional: schedule the sweep nightly with pg_cron (run once, if available).
--   create extension if not exists pg_cron;
--   select cron.schedule('hailguard-nightly-sweep', '0 1 * * *',
--                        $$ select public.run_compliance_sweep(); $$);
-- ---------------------------------------------------------------------------
