-- HailGuard — Public pass verification
--
-- Adds a SECURITY DEFINER function returning the minimal, sanitised compliance
-- information needed to verify a driver's digital Zone Pass at the roadside.
-- Authorities scan the QR on the driver's app; the QR resolves to a public
-- /verify/<subscription_id> page on the admin portal, which calls this RPC.
--
-- The function is callable by the `anon` role so the verify page works without
-- a signed-in session. RLS is intentionally bypassed because we project only
-- non-PII fields (no ID number, no email, no document paths) and gate which
-- subscriptions are returned (must exist; status is reported as-is so an
-- expired pass surfaces clearly as expired).

create or replace function public.verify_pass(p_subscription_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
           'subscriptionId', s.id,
           'status',         s.status,
           'planType',       s.plan_type,
           'startDate',      s.start_date,
           'endDate',        s.end_date,
           'currency',       s.currency,
           'zone',           jsonb_build_object(
                               'id',   z.id,
                               'name', z.name
                             ),
           'vehicle',        jsonb_build_object(
                               'make',         v.make,
                               'model',        v.model,
                               'year',         v.year,
                               'licensePlate', v.license_plate
                             ),
           'driver',         jsonb_build_object(
                               -- Show first name + masked surname only; never expose
                               -- the email, phone or ID document path here.
                               'displayName', case
                                 when u.full_name is null or u.full_name = '' then 'Driver'
                                 else split_part(u.full_name, ' ', 1) ||
                                      case when position(' ' in u.full_name) > 0
                                           then ' ' || left(split_part(u.full_name, ' ', 2), 1) || '.'
                                           else ''
                                      end
                               end
                             ),
           'verifiedAt',     now()
         )
    into result
    from public.subscriptions s
    join public.vehicles v        on v.id = s.vehicle_id
    join public.driver_profiles d on d.id = v.driver_id
    join public.users u           on u.id = d.user_id
    join public.zones z           on z.id = s.zone_id
   where s.id = p_subscription_id;

  return result; -- NULL when no such subscription
end;
$$;

revoke all on function public.verify_pass(uuid) from public;
grant execute on function public.verify_pass(uuid) to anon, authenticated;
