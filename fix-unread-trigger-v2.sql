-- Improved unread trigger with better error handling and logging
-- ==========================================================

-- 1) Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_message_insert_unread ON public.messages;
DROP TRIGGER IF EXISTS on_message_insert_unread_per_user ON public.messages;

-- 2) Create improved trigger function with logging
CREATE OR REPLACE FUNCTION public.handle_new_message_per_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'Trigger fired for message: conversation_id=%, receiver_id=%', NEW.conversation_id, NEW.receiver_id;
  
  -- Only increment unread count for the receiver (not the sender)
  INSERT INTO public.user_conversation_unread (user_id, conversation_id, unread_count)
  VALUES (NEW.receiver_id, NEW.conversation_id, 1)
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    unread_count = user_conversation_unread.unread_count + 1,
    updated_at = NOW();
  
  -- Log success
  RAISE NOTICE 'Unread count updated for user % in conversation %', NEW.receiver_id, NEW.conversation_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors but don't fail the message insert
    RAISE WARNING 'Error in handle_new_message_per_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Create the trigger
CREATE TRIGGER on_message_insert_unread_per_user
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message_per_user();

-- 4) Test the trigger with a sample message (uncomment to test)
-- INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content)
-- VALUES (
--   (SELECT id FROM conversations LIMIT 1),
--   (SELECT id FROM auth.users LIMIT 1),
--   (SELECT id FROM auth.users LIMIT 1 OFFSET 1),
--   'Test message for trigger'
-- );

-- 5) Verify the trigger worked
-- SELECT * FROM user_conversation_unread ORDER BY created_at DESC LIMIT 5;
