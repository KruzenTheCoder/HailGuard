-- HailGuard — Enable Supabase Realtime for Support Chats
--
-- Migration: 0017_enable_chat_realtime.sql
-- Run order: Adds chat_rooms and chat_messages to the supabase_realtime publication.

begin;
  -- Add tables to supabase_realtime publication to enable WebSocket broadcast
  alter publication supabase_realtime add table public.chat_rooms;
  alter publication supabase_realtime add table public.chat_messages;
commit;
