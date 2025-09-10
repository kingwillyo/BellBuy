-- Complete fix for unread count system
-- Run this entire script in Supabase SQL Editor
-- ==========================================================

-- 1) Ensure user_conversation_unread table exists
CREATE TABLE IF NOT EXISTS public.user_conversation_unread (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, conversation_id)
);

-- 2) Enable RLS
ALTER TABLE public.user_conversation_unread ENABLE ROW LEVEL SECURITY;

-- 3) Drop existing policies and recreate them
DROP POLICY IF EXISTS "user_conversation_unread_select_own" ON public.user_conversation_unread;
DROP POLICY IF EXISTS "user_conversation_unread_update_own" ON public.user_conversation_unread;
DROP POLICY IF EXISTS "user_conversation_unread_insert_own" ON public.user_conversation_unread;

-- 4) Create RLS policies
CREATE POLICY "user_conversation_unread_select_own" ON public.user_conversation_unread
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_conversation_unread_update_own" ON public.user_conversation_unread
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_conversation_unread_insert_own" ON public.user_conversation_unread
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5) Drop ALL existing triggers on messages table
DROP TRIGGER IF EXISTS on_message_insert_unread ON public.messages;
DROP TRIGGER IF EXISTS on_message_insert_unread_per_user ON public.messages;

-- 6) Create the trigger function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_message_per_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution for debugging
  RAISE NOTICE 'Trigger fired: conversation_id=%, receiver_id=%, sender_id=%', 
    NEW.conversation_id, NEW.receiver_id, NEW.sender_id;
  
  -- Only increment unread count for the receiver (not the sender)
  INSERT INTO public.user_conversation_unread (user_id, conversation_id, unread_count)
  VALUES (NEW.receiver_id, NEW.conversation_id, 1)
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    unread_count = user_conversation_unread.unread_count + 1,
    updated_at = NOW();
  
  RAISE NOTICE 'Unread count updated successfully';
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the message insert
    RAISE WARNING 'Error in handle_new_message_per_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7) Create the trigger
CREATE TRIGGER on_message_insert_unread_per_user
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message_per_user();

-- 8) Create helper functions
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_conversation_unread (user_id, conversation_id, unread_count, last_read_at)
  VALUES (auth.uid(), p_conversation_id, 0, NOW())
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    unread_count = 0,
    last_read_at = NOW(),
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_total_unread_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_unread INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(unread_count), 0) INTO total_unread
  FROM public.user_conversation_unread
  WHERE user_id = auth.uid();

  RETURN total_unread;
END;
$$;

-- 9) Test the setup
SELECT 'Setup complete. Trigger created successfully.' as status;

-- 10) Check if trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_message_insert_unread_per_user';
