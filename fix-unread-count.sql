-- Fix unread count system to be per-user instead of per-conversation
-- ==========================================================

-- 1) Create user_conversation_unread table to track unread counts per user per conversation
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

-- 3) RLS policies for user_conversation_unread
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'user_conversation_unread_select_own') THEN
    CREATE POLICY "user_conversation_unread_select_own" ON public.user_conversation_unread
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'user_conversation_unread_update_own') THEN
    CREATE POLICY "user_conversation_unread_update_own" ON public.user_conversation_unread
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'user_conversation_unread_insert_own') THEN
    CREATE POLICY "user_conversation_unread_insert_own" ON public.user_conversation_unread
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4) Replace the old message trigger with per-user unread tracking
CREATE OR REPLACE FUNCTION public.handle_new_message_per_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment unread count for the receiver (not the sender)
  INSERT INTO public.user_conversation_unread (user_id, conversation_id, unread_count)
  VALUES (NEW.receiver_id, NEW.conversation_id, 1)
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    unread_count = user_conversation_unread.unread_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_message_insert_unread ON public.messages;
CREATE TRIGGER on_message_insert_unread_per_user
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message_per_user();

-- 6) Function to mark messages as read (reset unread count for a user in a conversation)
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

  -- Reset unread count to 0 and update last_read_at
  INSERT INTO public.user_conversation_unread (user_id, conversation_id, unread_count, last_read_at)
  VALUES (auth.uid(), p_conversation_id, 0, NOW())
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    unread_count = 0,
    last_read_at = NOW(),
    updated_at = NOW();
END;
$$;

-- 7) Function to get total unread count for a user across all conversations
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
