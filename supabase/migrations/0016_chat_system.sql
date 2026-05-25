-- HailGuard — Driver Support Chat Room System
--
-- Migration: 0016_chat_system.sql
-- Run order: Creates chat_rooms and chat_messages tables with indices, triggers, and RLS policies.

-- Create public.chat_rooms
create table if not exists public.chat_rooms (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null unique references public.driver_profiles (id) on delete cascade,
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Create public.chat_messages
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.chat_rooms (id) on delete cascade,
  sender_id   uuid not null references public.users (id) on delete cascade,
  message     text not null,
  created_at  timestamptz not null default now()
);

-- Create indices
create index if not exists chat_rooms_driver_id_idx on public.chat_rooms (driver_id);
create index if not exists chat_rooms_updated_at_idx on public.chat_rooms (updated_at);
create index if not exists chat_messages_room_id_idx on public.chat_messages (room_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at);

-- Updated_at trigger for chat_rooms
create trigger chat_rooms_set_updated_at
  before update on public.chat_rooms
  for each row execute function public.set_updated_at();

-- Trigger function to bump updated_at on the chat_room when a message is added
create or replace function public.bump_chat_room_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_rooms
  set updated_at = now()
  where id = new.room_id;
  return new;
end;
$$;

-- Trigger to bump chat_room.updated_at
create or replace trigger on_chat_message_inserted
  after insert on public.chat_messages
  for each row execute function public.bump_chat_room_updated_at();

-- Enable Row-Level Security
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

-- RLS policies for chat_rooms
create policy "chat_rooms_select" on public.chat_rooms
  for select using (driver_id = public.current_driver_profile_id() or public.is_admin());

create policy "chat_rooms_insert" on public.chat_rooms
  for insert with check (driver_id = public.current_driver_profile_id() or public.is_admin());

create policy "chat_rooms_update" on public.chat_rooms
  for update using (driver_id = public.current_driver_profile_id() or public.is_admin())
  with check (driver_id = public.current_driver_profile_id() or public.is_admin());

create policy "chat_rooms_delete" on public.chat_rooms
  for delete using (public.is_admin());

-- RLS policies for chat_messages
create policy "chat_messages_select" on public.chat_messages
  for select using (exists (
    select 1 from public.chat_rooms
    where id = room_id and (driver_id = public.current_driver_profile_id() or public.is_admin())
  ));

create policy "chat_messages_insert" on public.chat_messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.chat_rooms
      where id = room_id and (driver_id = public.current_driver_profile_id() or public.is_admin())
    )
  );

create policy "chat_messages_update" on public.chat_messages
  for update using (public.is_admin()) with check (public.is_admin());

create policy "chat_messages_delete" on public.chat_messages
  for delete using (public.is_admin());

-- Grant access to authenticated users
grant select, insert, update, delete on public.chat_rooms to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
