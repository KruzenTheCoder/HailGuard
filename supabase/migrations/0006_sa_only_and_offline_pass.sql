-- HailGuard — South Africa only + offline pass signing + verify audit trail
--
-- Three things in one migration:
--
-- 1. The platform is ZAR-only. Drop the `currency` column from zones,
--    subscriptions and payments. App code formats everything as Rand via
--    `formatZAR`; carrying an unused column was dead weight.
--
-- 2. Add HMAC-based pass-signing functions so a driver's QR can be verified
--    locally by the inspector without round-tripping the DB (offline grace).
--    The verify page still checks the DB for revocation when it has network.
--
-- 3. `verify_pass()` now writes an `audit_logs` row on every call — a
--    tamper-evident verification trail — and stops returning currency.

-- ---------------------------------------------------------------------------
-- 1. Drop the currency columns (SA-only)
-- ---------------------------------------------------------------------------
alter table public.zones         drop column if exists currency;
alter table public.subscriptions drop column if exists currency;
alter table public.payments      drop column if exists currency;

-- Recreate the subscription-activation RPC so it stops writing to the dropped
-- payments.currency column. Behaviour is otherwise identical to the 0004
-- version.
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

  select dp.user_id into v_owner
  from public.vehicles veh
  join public.driver_profiles dp on dp.id = veh.driver_id
  where veh.id = v_sub.vehicle_id;

  if v_owner is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Not authorized for this subscription';
  end if;

  if v_sub.status = 'active' then
    return v_sub;
  end if;

  v_end := case v_sub.plan_type
    when 'monthly' then (current_date + interval '1 month')::date
    when 'yearly'  then (current_date + interval '1 year')::date
  end;

  insert into public.payments (subscription_id, provider, provider_reference, amount, status)
  values (v_sub.id, coalesce(p_provider, 'stub'), p_reference, v_sub.amount, 'succeeded');

  update public.subscriptions
  set status = 'active', start_date = current_date, end_date = v_end
  where id = v_sub.id
  returning * into v_sub;

  return v_sub;
end;
$$;

grant execute on function public.confirm_subscription_payment(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Pass signing — HMAC-SHA256
-- ---------------------------------------------------------------------------
-- Signing secret lives in a Postgres GUC. Operators must run:
--
--   alter database postgres set app.pass_signing_secret to 'GENERATE-A-STRONG-RANDOM-STRING';
--
-- For Supabase hosted projects, set it in Project Settings → Database →
-- Custom Postgres Config. The functions below fail-closed (return NULL) when
-- the secret is missing, so a misconfigured deployment never produces
-- forgeable tokens.

create or replace function public._pass_signing_secret()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.pass_signing_secret', true), '');
$$;

-- Standard base64url (no padding) so the token is URL-safe.
create or replace function public._b64url_encode(p_bytes bytea)
returns text
language sql
immutable
as $$
  select rtrim(translate(encode(p_bytes, 'base64'), E'+/\n', '-_'), '=');
$$;

create or replace function public._b64url_decode(p_text text)
returns bytea
language plpgsql
immutable
as $$
declare
  s text := translate(p_text, '-_', '+/');
  pad int := (4 - length(s) % 4) % 4;
begin
  return decode(s || repeat('=', pad), 'base64');
end;
$$;

-- Constant-time-ish equality. Postgres has no built-in CT compare; we settle
-- for length-equal short-circuit + a non-shortcircuit XOR fold.
create or replace function public._bytes_eq(a bytea, b bytea)
returns boolean
language plpgsql
immutable
as $$
declare
  diff int := 0;
  i int;
begin
  if length(a) <> length(b) then return false; end if;
  for i in 0 .. length(a) - 1 loop
    diff := diff | (get_byte(a, i) # get_byte(b, i));
  end loop;
  return diff = 0;
end;
$$;

-- Issue a self-contained, HMAC-signed Zone Pass token. Mobile fetches this
-- once at certificate render time and embeds it in the QR alongside the
-- subscription URL. Returns NULL when the caller can't see the subscription
-- or the signing secret isn't configured (fail-closed).
create or replace function public.sign_pass_token(p_subscription_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_secret text := public._pass_signing_secret();
  v_payload jsonb;
  v_payload_b64 text;
  v_sig_b64 text;
begin
  if v_secret is null then
    return null;
  end if;

  select jsonb_build_object(
           'sid',   s.id,
           'plate', v.license_plate,
           'zone',  z.name,
           'plan',  s.plan_type,
           'st',    s.start_date,
           'exp',   s.end_date,
           'iat',   extract(epoch from now())::bigint
         )
    into v_payload
    from public.subscriptions s
    join public.vehicles v        on v.id = s.vehicle_id
    join public.driver_profiles d on d.id = v.driver_id
    join public.zones z           on z.id = s.zone_id
   where s.id = p_subscription_id
     and s.status = 'active'
     and (
       d.user_id = auth.uid()
       or public.is_admin()
     );

  if v_payload is null then
    return null;
  end if;

  v_payload_b64 := public._b64url_encode(convert_to(v_payload::text, 'UTF8'));
  v_sig_b64 := public._b64url_encode(
    extensions.hmac(v_payload_b64, v_secret, 'sha256')
  );
  return v_payload_b64 || '.' || v_sig_b64;
end;
$$;

revoke all on function public.sign_pass_token(uuid) from public;
grant execute on function public.sign_pass_token(uuid) to authenticated;

-- Validate a signed token. Returns the JSON payload when the signature is
-- valid AND the token has not expired. Returns NULL otherwise. Anyone can
-- call this — it's a stateless signature check, no PII beyond what the
-- driver already embedded in their own QR.
create or replace function public.verify_pass_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_secret text := public._pass_signing_secret();
  v_dot int;
  v_payload_b64 text;
  v_sig_b64 text;
  v_expected bytea;
  v_actual bytea;
  v_payload jsonb;
  v_exp text;
begin
  if v_secret is null or p_token is null then
    return null;
  end if;

  v_dot := position('.' in p_token);
  if v_dot < 2 then return null; end if;

  v_payload_b64 := left(p_token, v_dot - 1);
  v_sig_b64     := substring(p_token from v_dot + 1);

  v_expected := extensions.hmac(v_payload_b64, v_secret, 'sha256');
  begin
    v_actual := public._b64url_decode(v_sig_b64);
  exception when others then
    return null;
  end;

  if not public._bytes_eq(v_expected, v_actual) then
    return null;
  end if;

  begin
    v_payload := convert_from(public._b64url_decode(v_payload_b64), 'UTF8')::jsonb;
  exception when others then
    return null;
  end;

  v_exp := v_payload ->> 'exp';
  if v_exp is not null and v_exp::date < current_date then
    -- Signature was valid but the pass period has elapsed.
    return jsonb_build_object('signatureValid', true, 'expired', true, 'payload', v_payload);
  end if;

  return jsonb_build_object('signatureValid', true, 'expired', false, 'payload', v_payload);
end;
$$;

revoke all on function public.verify_pass_token(text) from public;
grant execute on function public.verify_pass_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. verify_pass(): drop currency, write audit log on every call
-- ---------------------------------------------------------------------------
create or replace function public.verify_pass(p_subscription_id uuid)
returns jsonb
language plpgsql
volatile             -- changed from STABLE: we INSERT into audit_logs
security definer
set search_path = public
as $$
declare
  result jsonb;
  v_status text;
begin
  select jsonb_build_object(
           'subscriptionId', s.id,
           'status',         s.status,
           'planType',       s.plan_type,
           'startDate',      s.start_date,
           'endDate',        s.end_date,
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
         ),
         s.status::text
    into result, v_status
    from public.subscriptions s
    join public.vehicles v        on v.id = s.vehicle_id
    join public.driver_profiles d on d.id = v.driver_id
    join public.users u           on u.id = d.user_id
    join public.zones z           on z.id = s.zone_id
   where s.id = p_subscription_id;

  -- Tamper-evident trail: log every verification attempt (including misses).
  -- actor_id is NULL when the caller is anon (typical inspector scan).
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, detail)
  values (
    auth.uid(),
    'pass.verify',
    'subscription',
    p_subscription_id,
    jsonb_build_object(
      'found',  result is not null,
      'status', v_status
    )
  );

  return result;
end;
$$;

revoke all on function public.verify_pass(uuid) from public;
grant execute on function public.verify_pass(uuid) to anon, authenticated;
