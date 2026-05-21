-- HailGuard — subscription payment confirmation RPC
--
-- Drivers can INSERT a subscription (status 'pending_payment') but RLS blocks
-- them from setting it 'active' or writing to payments. This SECURITY DEFINER
-- function performs the privileged activation after a (stub) payment, with an
-- explicit ownership check. A real payment provider's webhook would call the
-- same logic server-side using the service role instead.

create or replace function public.confirm_subscription_payment(
  p_subscription_id uuid,
  p_provider text default 'stub',
  p_reference text default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub   public.subscriptions;
  v_owner uuid;
  v_end   date;
begin
  select * into v_sub from public.subscriptions where id = p_subscription_id;
  if not found then
    raise exception 'Subscription not found';
  end if;

  -- Caller must own the vehicle behind the subscription (or be an admin).
  select dp.user_id into v_owner
  from public.vehicles veh
  join public.driver_profiles dp on dp.id = veh.driver_id
  where veh.id = v_sub.vehicle_id;

  if v_owner is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Not authorized for this subscription';
  end if;

  -- Idempotent: already active → return as-is.
  if v_sub.status = 'active' then
    return v_sub;
  end if;

  v_end := case v_sub.plan_type
    when 'monthly' then (current_date + interval '1 month')::date
    when 'yearly'  then (current_date + interval '1 year')::date
  end;

  insert into public.payments (subscription_id, provider, provider_reference, amount, currency, status)
  values (v_sub.id, coalesce(p_provider, 'stub'), p_reference, v_sub.amount, v_sub.currency, 'succeeded');

  update public.subscriptions
  set status = 'active', start_date = current_date, end_date = v_end
  where id = v_sub.id
  returning * into v_sub;

  return v_sub;
end;
$$;

grant execute on function public.confirm_subscription_payment(uuid, text, text) to authenticated;
