-- HailGuard — core schema
-- E-Hailing Zone Compliance Platform
--
-- Run order: this is the first migration. Defines enums, tables, indexes,
-- and the triggers/functions the app depends on. RLS policies live in
-- 0002_rls.sql; storage buckets in 0003_storage.sql.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('driver', 'admin');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.vehicle_status as enum ('pending', 'active', 'suspended', 'rejected');
create type public.subscription_status as enum ('pending_payment', 'active', 'expired', 'cancelled');
create type public.plan_type as enum ('monthly', 'yearly');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role not null default 'driver',
  full_name     text,
  phone_number  text,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'Application profile extending auth.users. Role defaults to driver; admins are promoted manually.';

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Provision a public.users row whenever a new auth user signs up.
-- Role is forced to 'driver' here — never trust client-supplied role metadata
-- (prevents privilege escalation via signup payload).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, role, full_name, phone_number, email)
  values (
    new.id,
    'driver',
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.phone, nullif(new.raw_user_meta_data ->> 'phone_number', '')),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check used throughout RLS. SECURITY DEFINER so it reads public.users
-- without triggering that table's RLS (avoids recursive policy evaluation).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- driver_profiles (one per user)
-- ---------------------------------------------------------------------------
create table public.driver_profiles (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null unique references public.users (id) on delete cascade,
  id_number                text,
  license_number           text,
  id_document_path         text,
  license_document_path    text,
  -- Per-platform verification, e.g.
  -- {"uber": {"status": "approved", "proofPath": "..."}, "bolt": {...}}
  platform_verifications   jsonb not null default '{}'::jsonb,
  status                   public.review_status not null default 'pending',
  review_note              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index driver_profiles_user_id_idx on public.driver_profiles (user_id);
create index driver_profiles_status_idx on public.driver_profiles (status);

create trigger driver_profiles_set_updated_at
  before update on public.driver_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vehicles (many per driver)
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id                            uuid primary key default gen_random_uuid(),
  driver_id                     uuid not null references public.driver_profiles (id) on delete cascade,
  make                          text not null,
  model                         text not null,
  year                          int not null check (year between 1950 and (extract(year from now())::int + 1)),
  license_plate                 text not null,
  registration_document_path    text,
  roadworthy_certificate_path   text,
  roadworthy_expires_at         date,
  status                        public.vehicle_status not null default 'pending',
  review_note                   text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (driver_id, license_plate)
);

create index vehicles_driver_id_idx on public.vehicles (driver_id);
create index vehicles_status_idx on public.vehicles (status);

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- zones
-- ---------------------------------------------------------------------------
create table public.zones (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null unique,
  description           text,
  monthly_fee           numeric(10, 2) not null default 0 check (monthly_fee >= 0),
  yearly_fee            numeric(10, 2) not null default 0 check (yearly_fee >= 0),
  currency              text not null default 'ZAR',
  -- GeoJSON-style array of [lng, lat] pairs forming a closed ring.
  polygon_coordinates   jsonb,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index zones_is_active_idx on public.zones (is_active);

create trigger zones_set_updated_at
  before update on public.zones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscriptions (a vehicle's compliance in a zone)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references public.vehicles (id) on delete cascade,
  zone_id       uuid not null references public.zones (id) on delete restrict,
  plan_type     public.plan_type not null,
  status        public.subscription_status not null default 'pending_payment',
  amount        numeric(10, 2) not null check (amount >= 0),
  currency      text not null default 'ZAR',
  start_date    date,
  end_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index subscriptions_vehicle_id_idx on public.subscriptions (vehicle_id);
create index subscriptions_zone_id_idx on public.subscriptions (zone_id);
create index subscriptions_status_idx on public.subscriptions (status);

-- At most one active subscription per vehicle+zone.
create unique index subscriptions_one_active_per_vehicle_zone
  on public.subscriptions (vehicle_id, zone_id)
  where status = 'active';

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payments (one or more per subscription, incl. refunds)
-- ---------------------------------------------------------------------------
create table public.payments (
  id                    uuid primary key default gen_random_uuid(),
  subscription_id       uuid not null references public.subscriptions (id) on delete cascade,
  provider              text not null default 'stub',
  provider_reference    text,
  amount                numeric(10, 2) not null,
  currency              text not null default 'ZAR',
  status                public.payment_status not null default 'pending',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index payments_subscription_id_idx on public.payments (subscription_id);
create index payments_status_idx on public.payments (status);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_logs (compliance trail for admin actions)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.users (id) on delete set null,
  action        text not null,            -- e.g. 'vehicle.approve', 'profile.reject'
  entity_type   text not null,            -- e.g. 'vehicle', 'driver_profile'
  entity_id     uuid,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
