-- HailGuard — server push notifications
--
-- push_tokens         : Expo push tokens registered by the mobile app.
-- notification_queue  : outbox filled by DB triggers; drained by the
--                       `push-dispatch` Edge Function which calls the Expo
--                       Push API and marks rows sent/failed.
--
-- Events that enqueue a push:
--   * vehicle flips to 'suspended'            -> notify the driver
--   * subscription flips to expired/cancelled -> notify the driver
--   * incident created (e.g. SOS)             -> notify all admins
--
-- Deploy the Edge Function (supabase/functions/push-dispatch) and schedule it,
-- e.g. every 2 minutes via pg_cron + pg_net, or Supabase scheduled functions.

-- ---------------------------------------------------------------------------
-- push_tokens
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  token      text not null unique,
  platform   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

alter table public.push_tokens enable row level security;

create policy "push_tokens: read own or admin"
  on public.push_tokens for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "push_tokens: upsert own"
  on public.push_tokens for insert to authenticated
  with check (user_id = auth.uid());
create policy "push_tokens: update own"
  on public.push_tokens for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "push_tokens: delete own"
  on public.push_tokens for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notification_queue (outbox)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_queue (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  title      text not null,
  body       text not null,
  data       jsonb not null default '{}'::jsonb,
  status     text not null default 'pending',   -- pending | sent | failed
  attempts   int not null default 0,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
create index if not exists notification_queue_pending_idx
  on public.notification_queue (created_at) where status = 'pending';

alter table public.notification_queue enable row level security;
-- Readable by admins; written by SECURITY DEFINER triggers and drained by the
-- service-role Edge Function (both bypass RLS). No driver-facing access.
create policy "notification_queue: admin read"
  on public.notification_queue for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- enqueue helper + event triggers
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_push(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  insert into public.notification_queue (user_id, title, body, data)
  values (p_user_id, p_title, p_body, coalesce(p_data, '{}'::jsonb));
end;
$$;

-- Vehicle suspended -> notify the driver.
create or replace function public.notify_vehicle_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if new.status = 'suspended' and old.status is distinct from 'suspended' then
    select user_id into v_uid from public.driver_profiles where id = new.driver_id;
    perform public.enqueue_push(
      v_uid,
      'Vehicle suspended',
      'Your ' || new.make || ' ' || new.model || ' (' || new.license_plate ||
        ') has been suspended. Resolve the compliance issue to reactivate.',
      jsonb_build_object('type', 'vehicle_suspended', 'vehicleId', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger vehicles_notify_suspended
  after update on public.vehicles
  for each row execute function public.notify_vehicle_suspended();

-- Subscription expired/cancelled -> notify the driver.
create or replace function public.notify_subscription_ended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if new.status in ('expired', 'cancelled') and old.status = 'active' then
    select dp.user_id into v_uid
    from public.vehicles v
    join public.driver_profiles dp on dp.id = v.driver_id
    where v.id = new.vehicle_id;
    perform public.enqueue_push(
      v_uid,
      'Zone pass ' || new.status,
      'Your zone subscription is no longer active. Renew to keep operating compliantly.',
      jsonb_build_object('type', 'subscription_' || new.status, 'subscriptionId', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger subscriptions_notify_ended
  after update on public.subscriptions
  for each row execute function public.notify_subscription_ended();

-- Incident created -> notify all admins.
create or replace function public.notify_incident_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  v_label := case new.incident_type
    when 'sos_triggered' then 'SOS / Panic triggered'
    when 'accident' then 'Accident reported'
    when 'passenger_dispute' then 'Passenger dispute reported'
    else 'Compliance violation reported'
  end;
  insert into public.notification_queue (user_id, title, body, data)
  select u.id, v_label,
         'A driver reported an incident. Open the Incident Command Center to respond.',
         jsonb_build_object('type', 'incident', 'incidentId', new.id)
  from public.users u where u.role = 'admin';
  return new;
end;
$$;

create trigger incidents_notify_created
  after insert on public.incidents
  for each row execute function public.notify_incident_created();
