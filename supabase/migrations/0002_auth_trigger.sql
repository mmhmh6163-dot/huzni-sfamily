-- ============================================================
-- Huzni's Family — Auth Trigger Migration (idempotent)
-- File: 0002_auth_trigger.sql
-- Safe to run any number of times.
-- ============================================================

-- ============================================================
-- 1. DROP TRIGGER IF EXISTS (fixes 42710 error)
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;

-- ============================================================
-- 2. DROP + RECREATE FUNCTION (ensures latest logic)
-- ============================================================
drop function if exists public.handle_new_user() cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  counter int := 0;
begin
  -- Derive username: prefer metadata, fallback to email prefix
  uname := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );

  -- Ensure min length
  if length(uname) < 3 then
    uname := uname || floor(random() * 9999)::text;
  end if;

  -- Guarantee uniqueness (up to 20 tries)
  while exists (select 1 from public.profiles where username = uname) loop
    counter := counter + 1;
    uname := uname || floor(random() * 9999)::text;
    if counter > 20 then
      uname := uname || extract(epoch from now())::bigint::text;
      exit;
    end if;
  end loop;

  -- Insert profile (ignore if already created)
  insert into public.profiles (id, username, display_name, email)
  values (
    new.id,
    uname,
    coalesce(new.raw_user_meta_data->>'username', uname),
    new.email
  )
  on conflict (id) do nothing;

  -- Insert wallet with 0 balance (ignore if already created)
  insert into public.wallets (user_id, balance, total_earned, total_spent)
  values (new.id, 0, 0, 0)
  on conflict (user_id) do nothing;

  return new;

exception when others then
  -- Never block user signup because of a trigger error
  raise warning 'handle_new_user error: %', sqlerrm;
  return new;
end;
$$;

-- ============================================================
-- 3. CREATE THE TRIGGER
-- ============================================================
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- 4. BACKFILL — create profiles + wallets for any existing users
--    (in case some were created before the trigger)
-- ============================================================
do $$
declare
  u record;
  uname text;
  counter int;
begin
  for u in
    select id, email, raw_user_meta_data
    from auth.users
    where id not in (select id from public.profiles)
  loop
    uname := coalesce(
      nullif(trim(u.raw_user_meta_data->>'username'), ''),
      split_part(u.email, '@', 1)
    );
    if length(uname) < 3 then
      uname := uname || floor(random() * 9999)::text;
    end if;

    counter := 0;
    while exists (select 1 from public.profiles where username = uname) loop
      counter := counter + 1;
      uname := uname || floor(random() * 9999)::text;
      if counter > 20 then
        uname := uname || extract(epoch from now())::bigint::text;
        exit;
      end if;
    end loop;

    insert into public.profiles (id, username, display_name, email)
    values (u.id, uname, uname, u.email)
    on conflict (id) do nothing;
  end loop;

  -- Wallets for users missing one
  insert into public.wallets (user_id, balance, total_earned, total_spent)
  select u.id, 0, 0, 0
  from auth.users u
  where u.id not in (select user_id from public.wallets)
  on conflict (user_id) do nothing;
end $$;

-- ============================================================
-- 5. VERIFY
-- ============================================================
-- Run this separately to check — should return 1 row:
--   select tgname from pg_trigger where tgname = 'on_auth_user_created';
--
-- Should return matching counts:
--   select
--     (select count(*) from auth.users) as users,
--     (select count(*) from public.profiles) as profiles,
--     (select count(*) from public.wallets) as wallets;
-- ============================================================
