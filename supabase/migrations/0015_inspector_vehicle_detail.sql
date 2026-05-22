-- ---------------------------------------------------------------------------
-- Inspector vehicle detail
--
-- Returns everything a field inspector needs about a single vehicle so they
-- can do an extra-validation pass at the roadside: full spec sheet, current
-- driver summary, every subscription that has ever covered the vehicle, and
-- the recent incident history attached to it. Mirrors the auth model used by
-- the rest of the inspector_* surface (security definer + role guard).
-- ---------------------------------------------------------------------------
create or replace function public.inspector_vehicle_detail(p_vehicle_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if not (public.is_inspector() or public.is_admin()) then
    raise exception 'Not authorised';
  end if;

  select jsonb_build_object(
    'vehicle', jsonb_build_object(
      'id', v.id,
      'make', v.make,
      'model', v.model,
      'year', v.year,
      'plate', v.license_plate,
      'status', v.status,
      'reviewNote', v.review_note,
      'vinNumber', v.vin_number,
      'engineNumber', v.engine_number,
      'capacity', v.passenger_capacity,
      'category', v.vehicle_category,
      'roadworthyExpiresAt', v.roadworthy_expires_at,
      'hasRoadworthyCertificate', v.roadworthy_certificate_path is not null,
      'hasRegistrationDocument', v.registration_document_path is not null,
      'createdAt', v.created_at,
      'updatedAt', v.updated_at
    ),
    'driver', jsonb_build_object(
      'id', dp.id,
      'name', coalesce(u.full_name, 'Driver'),
      'phone', u.phone_number,
      'idNumber', dp.id_number,
      'licenseNumber', dp.license_number,
      'prdpStatus', dp.prdp_status,
      'prdpExpiresAt', dp.prdp_expires_at,
      'profileStatus', dp.status
    ),
    'subscriptions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'zone', z.name,
        'planType', s.plan_type,
        'status', s.status,
        'startDate', s.start_date,
        'endDate', s.end_date,
        'amount', s.amount,
        'currency', s.currency,
        'createdAt', s.created_at
      ) order by s.created_at desc), '[]'::jsonb)
      from public.subscriptions s
      join public.zones z on z.id = s.zone_id
      where s.vehicle_id = v.id
    ),
    'incidents', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id,
        'type', i.incident_type,
        'status', i.status,
        'notes', i.notes,
        'createdAt', i.created_at,
        'resolvedAt', i.resolved_at
      ) order by i.created_at desc), '[]'::jsonb)
      from public.incidents i
      where i.vehicle_id = v.id
      limit 20
    )
  )
  into v_payload
  from public.vehicles v
  join public.driver_profiles dp on dp.id = v.driver_id
  join public.users u on u.id = dp.user_id
  where v.id = p_vehicle_id;

  return v_payload;
end;
$$;

grant execute on function public.inspector_vehicle_detail(uuid) to authenticated;
