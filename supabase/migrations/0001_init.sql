-- ============================================================
-- Huzni's Family — Full Social Media Schema
-- Migration: 0001_init.sql
-- Project:   ziwqlcheflkjnswnqxcr
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES  (1:1 with auth.users)
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  email        text,
  avatar_url   text,
  bio          text,
  website      text,
  location     text,
  is_verified  boolean default false,
  is_private   boolean default false,
  followers_count int default 0,
  following_count int default 0,
  posts_count     int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  constraint username_len check (char_length(username) between 3 and 30)
);

create index if not exists idx_profiles_username on public.profiles(username);

-- ============================================================
-- 2. WALLETS  (1:1 with profiles)
-- ============================================================
create table if not exists public.wallets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique not null references auth.users(id) on delete cascade,
  balance      numeric(12,2) default 0 not null,
  total_earned numeric(12,2) default 0 not null,
  total_spent  numeric(12,2) default 0 not null,
  currency     text default 'USD',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Wallet transactions log
create table if not exists public.wallet_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     numeric(12,2) not null,
  type       text not null check (type in ('earn','spend','withdraw','deposit','bonus')),
  source     text,          -- e.g. 'post_like', 'tip', 'signup_bonus'
  ref_id     uuid,          -- optional reference to post/comment
  note       text,
  created_at timestamptz default now()
);

create index if not exists idx_tx_user on public.wallet_transactions(user_id, created_at desc);

-- ============================================================
-- 3. POSTS
-- ============================================================
create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  content        text,
  media_urls     text[] default '{}',       -- image / video URLs from Storage
  media_types    text[] default '{}',       -- 'image' | 'video'
  thumbnail_url  text,
  post_type      text default 'post' check (post_type in ('post','short','note','reel')),
  visibility     text default 'public' check (visibility in ('public','followers','private')),
  hashtags       text[] default '{}',
  mentions       uuid[] default '{}',
  likes_count    int default 0,
  comments_count int default 0,
  shares_count   int default 0,
  views_count    int default 0,
  is_edited      boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_posts_user on public.posts(user_id, created_at desc);
create index if not exists idx_posts_feed on public.posts(created_at desc);
create index if not exists idx_posts_type on public.posts(post_type);

-- ============================================================
-- 4. LIKES
-- ============================================================
create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

create index if not exists idx_likes_post on public.likes(post_id);

-- ============================================================
-- 5. COMMENTS
-- ============================================================
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  content    text not null,
  likes_count int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_comments_post on public.comments(post_id, created_at);

-- ============================================================
-- 6. FOLLOWS
-- ============================================================
create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index if not exists idx_follows_follower  on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);

-- ============================================================
-- 7. STORIES  (24h expiry)
-- ============================================================
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  media_url   text not null,
  media_type  text default 'image' check (media_type in ('image','video')),
  caption     text,
  views_count int default 0,
  expires_at  timestamptz default (now() + interval '24 hours'),
  created_at  timestamptz default now()
);

create index if not exists idx_stories_user    on public.stories(user_id, created_at desc);
create index if not exists idx_stories_expires on public.stories(expires_at);

-- ============================================================
-- 8. MESSAGES  (DM)
-- ============================================================
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content     text,
  media_url   text,
  is_read     boolean default false,
  created_at  timestamptz default now()
);

create index if not exists idx_msg_pair on public.messages(sender_id, receiver_id, created_at desc);
create index if not exists idx_msg_inbox on public.messages(receiver_id, is_read);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,
  type       text not null check (type in ('like','comment','follow','mention','message','tip')),
  ref_id     uuid,
  is_read    boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notif_user on public.notifications(user_id, is_read, created_at desc);

-- ============================================================
-- 10. TRIGGER: auto-create profile + wallet on new user
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  -- Derive a unique username from email prefix or metadata
  uname := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  -- Make it unique if needed
  while exists (select 1 from public.profiles where username = uname) loop
    uname := uname || floor(random() * 9999)::text;
  end loop;

  insert into public.profiles (id, username, display_name, email)
  values (
    new.id,
    uname,
    coalesce(new.raw_user_meta_data->>'username', uname),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 11. TRIGGER: update counters on like / comment / follow
-- ============================================================
create or replace function public.on_like_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_like_change on public.likes;
create trigger trg_like_change
  after insert or delete on public.likes
  for each row execute function public.on_like_change();

create or replace function public.on_comment_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comment_change on public.comments;
create trigger trg_comment_change
  after insert or delete on public.comments
  for each row execute function public.on_comment_change();

create or replace function public.on_follow_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_follow_change on public.follows;
create trigger trg_follow_change
  after insert or delete on public.follows
  for each row execute function public.on_follow_change();

create or replace function public.on_post_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set posts_count = posts_count + 1 where id = new.user_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set posts_count = greatest(posts_count - 1, 0) where id = old.user_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_change on public.posts;
create trigger trg_post_change
  after insert or delete on public.posts
  for each row execute function public.on_post_change();

-- ============================================================
-- 12. TRIGGER: auto-update updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated on public.posts;
create trigger trg_posts_updated
  before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wallets_updated on public.wallets;
create trigger trg_wallets_updated
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- ============================================================
-- 13. ENABLE ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.wallets             enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.posts               enable row level security;
alter table public.likes               enable row level security;
alter table public.comments            enable row level security;
alter table public.follows             enable row level security;
alter table public.stories             enable row level security;
alter table public.messages            enable row level security;
alter table public.notifications       enable row level security;

-- ============================================================
-- 14. RLS POLICIES
-- ============================================================

-- PROFILES
drop policy if exists "profiles readable by all"     on public.profiles;
drop policy if exists "user inserts own profile"     on public.profiles;
drop policy if exists "user updates own profile"     on public.profiles;

create policy "profiles readable by all"
  on public.profiles for select using (true);

create policy "user inserts own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "user updates own profile"
  on public.profiles for update using (auth.uid() = id);

-- WALLETS
drop policy if exists "wallets owner only" on public.wallets;

create policy "wallets owner only"
  on public.wallets for select using (auth.uid() = user_id);

create policy "wallets owner update"
  on public.wallets for update using (auth.uid() = user_id);

-- WALLET TRANSACTIONS
drop policy if exists "tx owner only" on public.wallet_transactions;

create policy "tx owner only"
  on public.wallet_transactions for select using (auth.uid() = user_id);

-- POSTS
drop policy if exists "posts readable by all"        on public.posts;
drop policy if exists "user inserts own post"        on public.posts;
drop policy if exists "user updates own post"        on public.posts;
drop policy if exists "user deletes own post"        on public.posts;

create policy "posts readable by all"
  on public.posts for select using (true);

create policy "user inserts own post"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "user updates own post"
  on public.posts for update using (auth.uid() = user_id);

create policy "user deletes own post"
  on public.posts for delete using (auth.uid() = user_id);

-- LIKES
drop policy if exists "likes readable by all"    on public.likes;
drop policy if exists "user manages own likes"   on public.likes;

create policy "likes readable by all"
  on public.likes for select using (true);

create policy "user manages own likes"
  on public.likes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- COMMENTS
drop policy if exists "comments readable by all"  on public.comments;
drop policy if exists "user manages own comments" on public.comments;

create policy "comments readable by all"
  on public.comments for select using (true);

create policy "user manages own comments"
  on public.comments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- FOLLOWS
drop policy if exists "follows readable by all"  on public.follows;
drop policy if exists "user manages own follows" on public.follows;

create policy "follows readable by all"
  on public.follows for select using (true);

create policy "user manages own follows"
  on public.follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- STORIES
drop policy if exists "stories readable by all"   on public.stories;
drop policy if exists "user manages own stories"  on public.stories;

create policy "stories readable by all"
  on public.stories for select using (true);

create policy "user manages own stories"
  on public.stories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- MESSAGES (only sender/receiver can see)
drop policy if exists "msg readable by participants" on public.messages;
drop policy if exists "user sends own messages"      on public.messages;

create policy "msg readable by participants"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "user sends own messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- NOTIFICATIONS
drop policy if exists "notif owner only" on public.notifications;

create policy "notif owner only"
  on public.notifications for select using (auth.uid() = user_id);

create policy "notif owner updates"
  on public.notifications for update using (auth.uid() = user_id);

-- ============================================================
-- 15. STORAGE BUCKETS (run this AFTER creating buckets in UI)
-- ============================================================
-- NOTE: Create buckets from Supabase Storage UI first:
--   • avatars  (public)
--   • posts    (public)
--   • videos   (public)
--   • stories  (public)
-- Then run the policies below.

-- Public read access on all buckets
drop policy if exists "public can view avatars" on storage.objects;
create policy "public can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "public can view posts" on storage.objects;
create policy "public can view posts"
  on storage.objects for select
  using (bucket_id = 'posts');

drop policy if exists "public can view videos" on storage.objects;
create policy "public can view videos"
  on storage.objects for select
  using (bucket_id = 'videos');

drop policy if exists "public can view stories" on storage.objects;
create policy "public can view stories"
  on storage.objects for select
  using (bucket_id = 'stories');

-- Authenticated users can upload to their own folder
drop policy if exists "auth users upload avatars" on storage.objects;
create policy "auth users upload avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth users upload posts" on storage.objects;
create policy "auth users upload posts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth users upload videos" on storage.objects;
create policy "auth users upload videos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth users upload stories" on storage.objects;
create policy "auth users upload stories"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own media
drop policy if exists "auth users delete own media" on storage.objects;
create policy "auth users delete own media"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars','posts','videos','stories')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 16. VIEWS
-- ============================================================

-- Public feed view (posts + author info)
create or replace view public.feed_posts as
select
  p.id,
  p.user_id,
  p.content,
  p.media_urls,
  p.media_types,
  p.post_type,
  p.visibility,
  p.hashtags,
  p.likes_count,
  p.comments_count,
  p.shares_count,
  p.views_count,
  p.created_at,
  pr.username,
  pr.display_name,
  pr.avatar_url,
  pr.is_verified
from public.posts p
join public.profiles pr on pr.id = p.user_id
where p.visibility = 'public';

-- ============================================================
-- 17. REALTIME
-- ============================================================
-- Enable realtime on key tables (Supabase uses this for live updates)
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
