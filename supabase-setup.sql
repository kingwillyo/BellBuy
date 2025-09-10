-- ... existing code ...
-- ==========================================================
-- Messages Table (Linked to Conversations)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Add unread_count to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;
-- ... existing code ...


-- ==========================================================
-- Profiles table, RLS policies and signup trigger
-- ==========================================================

-- 1) Ensure profiles table exists
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  gender text,
  hostel text,
  phone text,
  avatar_url text,
  expo_push_token text,
  created_at timestamp with time zone default now()
);

-- 2) Enable RLS
alter table public.profiles enable row level security;

-- 3) Policies
do $$ begin
  if not exists (select 1 from pg_policies where polname = 'profiles_select_own') then
    create policy profiles_select_own on public.profiles
      for select using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where polname = 'profiles_update_own') then
    create policy profiles_update_own on public.profiles
      for update using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where polname = 'profiles_insert_self') then
    create policy profiles_insert_self on public.profiles
      for insert with check (auth.uid() = id);
  end if;
end $$;

-- 4) Trigger to auto-create a profile on new user
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_full_name text;
  v_gender text;
  v_hostel text;
  v_phone text;
begin
  -- pull user_metadata values when present
  v_full_name := coalesce((new.raw_user_meta_data ->> 'full_name'), null);
  v_gender := coalesce((new.raw_user_meta_data ->> 'gender'), null);
  v_hostel := coalesce((new.raw_user_meta_data ->> 'hostel'), null);
  v_phone := coalesce((new.raw_user_meta_data ->> 'phone'), null);

  insert into public.profiles (id, email, full_name, gender, hostel, phone)
  values (new.id, new.email, v_full_name, v_gender, v_hostel, v_phone)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Also ensure profile exists when user is later confirmed/updated
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional RPC that clients can call after signup (when session exists)
create or replace function public.create_profile_if_not_exists(
  p_full_name text,
  p_gender text,
  p_hostel text,
  p_phone text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, email, full_name, gender, hostel, phone)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    p_full_name,
    p_gender,
    p_hostel,
    p_phone
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    gender = excluded.gender,
    hostel = excluded.hostel,
    phone = excluded.phone;
end;
$$;

-- Increment conversation unread_count whenever a new message is inserted
create or replace function public.handle_new_message()
returns trigger as $$
begin
  -- Safely try to bump unread_count; if column doesn't exist, ignore
  begin
    update public.conversations
    set unread_count = coalesce(unread_count, 0) + 1
    where id = new.conversation_id;
  exception
    when undefined_column then
      -- Column not present; skip without failing the message insert
      null;
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_message_insert_unread on public.messages;
create trigger on_message_insert_unread
  after insert on public.messages
  for each row execute procedure public.handle_new_message();

