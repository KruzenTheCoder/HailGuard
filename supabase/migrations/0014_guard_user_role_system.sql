-- HailGuard — allow system/service-role to set user roles
--
-- Role changes are performed by the service-role client (Team page actions and
-- the seed script) and by admins promoting users in the SQL editor — none of
-- which have an auth.uid(). The 0002 guard rejected those, so created/seeded
-- staff silently stayed 'driver'. Treat a null auth.uid() as a privileged
-- system context (a real driver always has an auth.uid(), so this can't be used
-- for self-escalation). Admins with a session continue to pass via is_admin().

create or replace function public.guard_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and not (public.is_admin() or auth.uid() is null) then
    raise exception 'Only admins can change user role';
  end if;
  return new;
end;
$$;
