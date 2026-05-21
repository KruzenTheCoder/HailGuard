-- HailGuard — bootstrap an admin user.
--
-- Creates (or upserts) an auth user with a known password, marks the email
-- as confirmed so OTP / magic-link sign-in works immediately, and promotes
-- the corresponding public.users row to role = 'admin'.
--
-- Run via the Supabase SQL editor (service role) or:
--   psql "$DATABASE_URL" -f supabase/seed_admin.sql
--
-- NOTE: the admin portal currently uses email-OTP sign-in only — the password
-- below is stored for future use (or direct password sign-in if enabled). To
-- log in today, hit /login, request a code, then enter the code from email.

do $$
declare
  v_email    text := 'kruz143000@gmail.com';
  v_password text := 'Test123!!!';
  v_user_id  uuid;
begin
  select id into v_user_id from auth.users where email = v_email limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
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
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- Email-provider identity (required by GoTrue for password / OTP sign-in).
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
    -- User already exists — reset password and confirm email so the seed is idempotent.
    update auth.users
       set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at         = now()
     where id = v_user_id;
  end if;

  -- The on_auth_user_created trigger inserts a public.users row with role='driver'.
  -- Promote to admin (and create the row defensively if the trigger was bypassed).
  insert into public.users (id, role, email)
       values (v_user_id, 'admin', v_email)
  on conflict (id) do update
       set role  = 'admin',
           email = excluded.email;
end
$$;
