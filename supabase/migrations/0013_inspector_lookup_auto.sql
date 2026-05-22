-- HailGuard — inspector lookup hardening
--
-- Recreates inspector_lookup so a single manual search tries ALL THREE
-- identifiers (QR subscription id → licence plate → SA ID number), and gives a
-- clearer auth error. 'auto' = try everything; the specific kinds still work.

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
    raise exception 'Not authorised — this account is not an inspector or admin.';
  end if;
  if v_val is null or v_val = '' then
    return null;
  end if;

  -- QR / subscription id (only when it parses as a uuid)
  if p_kind in ('subscription', 'auto') and v_driver is null then
    begin
      select v.driver_id into v_driver
      from public.subscriptions s
      join public.vehicles v on v.id = s.vehicle_id
      where s.id = v_val::uuid;
    exception when others then
      v_driver := null;
    end;
  end if;

  -- Licence plate (space/case-insensitive)
  if p_kind in ('plate', 'auto') and v_driver is null then
    select driver_id into v_driver
    from public.vehicles
    where upper(replace(license_plate, ' ', '')) = upper(replace(v_val, ' ', ''))
    limit 1;
  end if;

  -- SA ID number
  if p_kind in ('id', 'auto') and v_driver is null then
    select id into v_driver from public.driver_profiles where id_number = v_val limit 1;
  end if;

  if v_driver is null then
    return null;
  end if;
  return public.inspector_dossier(v_driver);
end;
$$;

grant execute on function public.inspector_lookup(text, text) to authenticated;
