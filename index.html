-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  email text,
  balance numeric default 0,
  created_at timestamptz default now()
);

-- Posts table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text,
  media_urls text[] default '{}',
  likes_count int default 0,
  comments_count int default 0,
  shares_count int default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- Profiles policies
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "user inserts own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "user updates own profile" on public.profiles for update using (auth.uid() = id);

-- Posts policies
create policy "posts readable by all" on public.posts for select using (true);
create policy "user inserts own post" on public.posts for insert with check (auth.uid() = user_id);
create policy "user updates own post" on public.posts for update using (auth.uid() = user_id);
create policy "user deletes own post" on public.posts for delete using (auth.uid() = user_id);
