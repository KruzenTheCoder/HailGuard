-- HailGuard — bootstrap a fully populated demo driver.
--
-- Creates (or upserts) Kruz Naidoo as a verified driver with:
--   * confirmed auth user (email + password sign-in ready)
--   * approved driver_profile with all three platforms verified
--   * one active vehicle
--   * an active monthly subscription on the Johannesburg CBD zone (seeded in seed.sql)
--   * a succeeded payment for that subscription
--
-- Requires the zones seed (supabase/seed.sql) to have run first so the
-- 'Johannesburg CBD' zone exists.
--
-- Run via the Supabase SQL editor (service role) or:
--   psql "$DATABASE_URL" -f supabase/seed_driver.sql
--
-- Document storage paths follow the bucket layout (uid/vehicle_id/...) but the
-- underlying objects are not uploaded here — image previews will 404 until
-- real files are placed in the driver-documents / vehicle-documents buckets.

do $$
declare
  v_email      text := 'kruzthecoder@gmail.com';
  v_password   text := 'Test123!!!';
  v_full_name  text := 'Kruz Naidoo';
  v_phone      text := '+27825551234';
  v_user_id    uuid;
  v_profile_id uuid;
  v_vehicle_id uuid;
  v_zone_id    uuid;
  v_sub_id     uuid;
  v_start      date := current_date;
  v_end        date := current_date + interval '30 days';
begin
  -- 1. auth.users -----------------------------------------------------------
  select id into v_user_id from auth.users where email = v_email limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      phone,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_phone,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name, 'phone_number', v_phone),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      v_user_id::text,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    );
  else
    update auth.users
       set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           phone              = coalesce(phone, v_phone),
           raw_user_meta_data = raw_user_meta_data
             || jsonb_build_object('full_name', v_full_name, 'phone_number', v_phone),
           updated_at         = now()
     where id = v_user_id;
  end if;

  -- 2. public.users (the trigger inserts a driver row; backfill name/phone) --
  insert into public.users (id, role, full_name, phone_number, email)
       values (v_user_id, 'driver', v_full_name, v_phone, v_email)
  on conflict (id) do update
       set role         = 'driver',
           full_name    = excluded.full_name,
           phone_number = excluded.phone_number,
           email        = excluded.email;

  -- 3. driver_profiles ------------------------------------------------------
  select id into v_profile_id from public.driver_profiles where user_id = v_user_id;

  if v_profile_id is null then
    insert into public.driver_profiles (
      user_id,
      id_number,
      license_number,
      id_document_path,
      license_document_path,
      platform_verifications,
      status,
      review_note
    )
    values (
      v_user_id,
      '9001015800087',
      '4502123456',
      v_user_id::text || '/id_document.jpg',
      v_user_id::text || '/drivers_license.jpg',
      jsonb_build_object(
        'uber',    jsonb_build_object('status', 'approved', 'proofPath', v_user_id::text || '/uber_proof.jpg',    'verifiedAt', now()),
        'bolt',    jsonb_build_object('status', 'approved', 'proofPath', v_user_id::text || '/bolt_proof.jpg',    'verifiedAt', now()),
        'indrive', jsonb_build_object('status', 'approved', 'proofPath', v_user_id::text || '/indrive_proof.jpg', 'verifiedAt', now())
      ),
      'approved',
      'Auto-verified demo driver.'
    )
    returning id into v_profile_id;
  else
    update public.driver_profiles
       set id_number              = '9001015800087',
           license_number         = '4502123456',
           id_document_path       = v_user_id::text || '/id_document.jpg',
           license_document_path  = v_user_id::text || '/drivers_license.jpg',
           platform_verifications = jsonb_build_object(
             'uber',    jsonb_build_object('status', 'approved', 'proofPath', v_user_id::text || '/uber_proof.jpg',    'verifiedAt', now()),
             'bolt',    jsonb_build_object('status', 'approved', 'proofPath', v_user_id::text || '/bolt_proof.jpg',    'verifiedAt', now()),
             'indrive', jsonb_build_object('status', 'approved', 'proofPath', v_user_id::text || '/indrive_proof.jpg', 'verifiedAt', now())
           ),
           status                 = 'approved',
           review_note            = 'Auto-verified demo driver.'
     where id = v_profile_id;
  end if;

  -- 4. vehicle --------------------------------------------------------------
  select id into v_vehicle_id
    from public.vehicles
   where driver_id = v_profile_id and license_plate = 'GP 555 KZN';

  if v_vehicle_id is null then
    insert into public.vehicles (
      driver_id,
      make,
      model,
      year,
      license_plate,
      registration_document_path,
      roadworthy_certificate_path,
      roadworthy_expires_at,
      status,
      review_note
    )
    values (
      v_profile_id,
      'Toyota',
      'Corolla Quest',
      2022,
      'GP 555 KZN',
      v_user_id::text || '/registration.pdf',
      v_user_id::text || '/roadworthy.pdf',
      current_date + interval '11 months',
      'active',
      'Auto-approved for demo.'
    )
    returning id into v_vehicle_id;
  else
    update public.vehicles
       set make                       = 'Toyota',
           model                      = 'Corolla Quest',
           year                       = 2022,
           registration_document_path = v_user_id::text || '/registration.pdf',
           roadworthy_certificate_path= v_user_id::text || '/roadworthy.pdf',
           roadworthy_expires_at      = current_date + interval '11 months',
           status                     = 'active',
           review_note                = 'Auto-approved for demo.'
     where id = v_vehicle_id;
  end if;

  -- 5. zone lookup ----------------------------------------------------------
  select id into v_zone_id from public.zones where name = 'Johannesburg CBD' limit 1;
  if v_zone_id is null then
    raise exception 'Zone "Johannesburg CBD" not found — run supabase/seed.sql first.';
  end if;

  -- 6. subscription ---------------------------------------------------------
  select id into v_sub_id
    from public.subscriptions
   where vehicle_id = v_vehicle_id
     and zone_id    = v_zone_id
     and status     = 'active';

  if v_sub_id is null then
    insert into public.subscriptions (
      vehicle_id,
      zone_id,
      plan_type,
      status,
      amount,
      currency,
      start_date,
      end_date
    )
    values (
      v_vehicle_id,
      v_zone_id,
      'monthly',
      'active',
      450.00,
      'ZAR',
      v_start,
      v_end
    )
    returning id into v_sub_id;
  else
    update public.subscriptions
       set plan_type  = 'monthly',
           status     = 'active',
           amount     = 450.00,
           currency   = 'ZAR',
           start_date = v_start,
           end_date   = v_end
     where id = v_sub_id;
  end if;

  -- 7. payment --------------------------------------------------------------
  insert into public.payments (
    subscription_id,
    provider,
    provider_reference,
    amount,
    currency,
    status
  )
  select v_sub_id, 'stub', 'DEMO-' || v_sub_id::text, 450.00, 'ZAR', 'succeeded'
  where not exists (
    select 1 from public.payments
     where subscription_id = v_sub_id and status = 'succeeded'
  );
end
$$;
