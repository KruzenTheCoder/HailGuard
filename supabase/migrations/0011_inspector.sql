-- HailGuard — Inspector role (field compliance officers)
--
-- Inspectors use a SEPARATE mobile app to scan a driver's Zone Pass QR (or look
-- up by plate / ID), view a compliance dossier, and act (suspend a vehicle,
-- revoke a driver's compliance, report an incident). Inspectors have NO admin
-- portal access (is_admin() stays false for them); all their data access goes
-- through the SECURITY DEFINER RPCs below.

-- ---------------------------------------------------------------------------
-- Role + helper
-- ---------------------------------------------------------------------------
alter type public.user_role add value if not exists 'inspector';

create or replace function public.is_inspector()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role::text = 'inspector'
  );
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (key, description) values
  ('driver:lookup',     'Look up a driver/vehicle compliance dossier (field)'),
  ('compliance:revoke', 'Suspend/revoke a vehicle or driver compliance'),
  ('incident:report',   'Report an incident against a driver')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key) values
  ('inspector', 'driver:lookup'),
  ('inspector', 'compliance:revoke'),
  ('inspector', 'incident:report')
on conflict do nothing;

-- Grant the new permissions to the full-access backoffice roles too.
insert into public.role_permissions (role, permission_key)
select r, p from (values ('super_admin'), ('admin'), ('compliance_admin')) as roles(r)
cross join (values ('driver:lookup'), ('compliance:revoke'), ('incident:report')) as perms(p)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Allow inspectors to change vehicle status (suspend) past the review guard.
-- ---------------------------------------------------------------------------
create or replace function public.guard_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or public.is_inspector() or auth.uid() is null then
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
-- Compliance dossier (everything an inspector needs about one driver)
-- ---------------------------------------------------------------------------
create or replace function public.inspector_dossier(p_driver_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'driverId', dp.id,
    'driver', jsonb_build_object(
      'name', coalesce(u.full_name, 'Driver'),
      'phone', u.phone_number,
      'idNumber', dp.id_number,
      'licenseNumber', dp.license_number,
      'prdpStatus', dp.prdp_status,
      'prdpExpiresAt', dp.prdp_expires_at,
      'profileStatus', dp.status
    ),
    'vehicles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', v.id, 'make', v.make, 'model', v.model, 'plate', v.license_plate,
        'status', v.status, 'capacity', v.passenger_capacity,
        'category', v.vehicle_category, 'roadworthyExpiresAt', v.roadworthy_expires_at
      ) order by v.created_at), '[]'::jsonb)
      from public.vehicles v where v.driver_id = dp.id
    ),
    'activeSubscriptions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'zone', z.name, 'plate', v.license_plate,
        'status', s.status, 'endDate', s.end_date
      )), '[]'::jsonb)
      from public.subscriptions s
      join public.vehicles v on v.id = s.vehicle_id
      join public.zones z on z.id = s.zone_id
      where v.driver_id = dp.id and s.status = 'active'
    )
  )
  from public.driver_profiles dp
  join public.users u on u.id = dp.user_id
  where dp.id = p_driver_id;
$$;

-- ---------------------------------------------------------------------------
-- Lookup by QR subscription id, licence plate, or SA ID number -> dossier
-- ---------------------------------------------------------------------------
create or replace function public.inspector_lookup(p_kind text, p_value text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_driver uuid;
  v_val text := trim(p_value);
begin
  if not (public.is_inspector() or public.is_admin()) then
    raise exception 'Not authorised';
  end if;
  if v_val is null or v_val = '' then
    return null;
  end if;

  if p_kind = 'subscription' then
    begin
      select v.driver_id into v_driver
      from public.subscriptions s
      join public.vehicles v on v.id = s.vehicle_id
      where s.id = v_val::uuid;
    exception when others then
      return null;
    end;
  elsif p_kind = 'plate' then
    select driver_id into v_driver
    from public.vehicles
    where upper(replace(license_plate, ' ', '')) = upper(replace(v_val, ' ', ''))
    limit 1;
  elsif p_kind = 'id' then
    select id into v_driver from public.driver_profiles where id_number = v_val limit 1;
  else
    raise exception 'Unknown lookup kind';
  end if;

  if v_driver is null then
    return null;
  end if;
  return public.inspector_dossier(v_driver);
end;
$$;

-- ---------------------------------------------------------------------------
-- Inspector actions
-- ---------------------------------------------------------------------------
create or replace function public.inspector_suspend_vehicle(p_vehicle_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver uuid;
begin
  if not (public.is_inspector() or public.is_admin()) then
    raise exception 'Not authorised';
  end if;
  update public.vehicles set status = 'suspended'
   where id = p_vehicle_id and status <> 'suspended'
   returning driver_id into v_driver;
  if v_driver is null then
    return jsonb_build_object('ok', false, 'message', 'Vehicle not found or already suspended');
  end if;
  insert into public.compliance_logs (driver_id, vehicle_id, action_type, performed_by, notes)
  values (v_driver, p_vehicle_id, 'vehicle_suspended', auth.uid(),
          coalesce('Field suspension: ' || nullif(trim(p_reason), ''), 'Field suspension by inspector'));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.inspector_report_incident(
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_type text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (public.is_inspector() or public.is_admin()) then
    raise exception 'Not authorised';
  end if;
  insert into public.incidents (driver_id, vehicle_id, incident_type, notes)
  values (p_driver_id, p_vehicle_id, p_type::public.incident_type, nullif(trim(p_notes), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Allow inspectors (not just admins) to revoke a driver's whole compliance.
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
  if not (public.is_admin() or public.is_inspector()) then
    raise exception 'Not authorised to revoke compliance';
  end if;

  for r in
    update public.subscriptions s set status = 'cancelled'
     where s.status = 'active'
       and s.vehicle_id in (select id from public.vehicles where driver_id = p_driver_id)
    returning s.id, s.vehicle_id
  loop
    v_subs := v_subs + 1;
    insert into public.compliance_logs (driver_id, vehicle_id, action_type, performed_by, notes)
    values (p_driver_id, r.vehicle_id, 'compliance_revoked', auth.uid(), 'Subscription cancelled via revoke');
  end loop;

  for r in
    update public.vehicles set status = 'suspended'
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

grant execute on function public.inspector_dossier(uuid) to authenticated;
grant execute on function public.inspector_lookup(text, text) to authenticated;
grant execute on function public.inspector_suspend_vehicle(uuid, text) to authenticated;
grant execute on function public.inspector_report_incident(uuid, uuid, text, text) to authenticated;
