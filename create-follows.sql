-- ==========================================================
-- Follows table for social graph (followers/following)
-- ==========================================================

-- Create table if not exists
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(follower_id, following_id)
);

-- Enable RLS
alter table public.follows enable row level security;

-- Policies
do $$ begin
  if not exists (select 1 from pg_policies where polname = 'follows_select_all') then
    create policy follows_select_all on public.follows
      for select
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where polname = 'follows_insert_self') then
    create policy follows_insert_self on public.follows
      for insert
      with check (auth.uid() = follower_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where polname = 'follows_delete_self') then
    create policy follows_delete_self on public.follows
      for delete
      using (auth.uid() = follower_id);
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);


