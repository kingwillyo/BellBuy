-- Update message trigger to send push notifications
-- ==========================================================

-- 1) Drop existing trigger
DROP TRIGGER IF EXISTS on_message_insert_unread_per_user ON public.messages;

-- 2) Create enhanced trigger function that handles both unread count and notifications
CREATE OR REPLACE FUNCTION public.handle_new_message_with_notifications()
RETURNS TRIGGER AS $$
DECLARE
  notification_url TEXT;
  notification_payload JSONB;
  notification_response TEXT;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'Trigger fired for message: conversation_id=%, receiver_id=%, sender_id=%', 
    NEW.conversation_id, NEW.receiver_id, NEW.sender_id;
  
  -- Update unread count for the receiver
  INSERT INTO public.user_conversation_unread (user_id, conversation_id, unread_count)
  VALUES (NEW.receiver_id, NEW.conversation_id, 1)
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    unread_count = user_conversation_unread.unread_count + 1,
    updated_at = NOW();
  
  RAISE NOTICE 'Unread count updated for user % in conversation %', NEW.receiver_id, NEW.conversation_id;
  
  -- Send push notification via Edge Function
  -- Get the Supabase URL from environment (this will be set by Supabase)
  notification_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send_message_notification';
  
  -- If we can't get the URL from settings, construct it from the request
  IF notification_url IS NULL OR notification_url = '' THEN
    notification_url := 'https://pdehjhhuceqmltpvosfh.supabase.co/functions/v1/send_message_notification';
  END IF;
  
  -- Prepare notification payload
  notification_payload := jsonb_build_object(
    'message_id', NEW.id,
    'conversation_id', NEW.conversation_id,
    'sender_id', NEW.sender_id,
    'receiver_id', NEW.receiver_id,
    'content', NEW.content
  );
  
  -- Send notification asynchronously using pg_net extension
  -- Note: This requires the pg_net extension to be enabled in Supabase
  BEGIN
    PERFORM net.http_post(
      url := notification_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := notification_payload::text
    );
    RAISE NOTICE 'Push notification request sent for message %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the message insert
      RAISE WARNING 'Failed to send push notification: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors but don't fail the message insert
    RAISE WARNING 'Error in handle_new_message_with_notifications: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Create the trigger
CREATE TRIGGER on_message_insert_with_notifications
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message_with_notifications();

-- 4) Alternative: Simple trigger that just calls the Edge Function via HTTP
-- (Use this if pg_net is not available)
CREATE OR REPLACE FUNCTION public.handle_new_message_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Update unread count
  INSERT INTO public.user_conversation_unread (user_id, conversation_id, unread_count)
  VALUES (NEW.receiver_id, NEW.conversation_id, 1)
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    unread_count = user_conversation_unread.unread_count + 1,
    updated_at = NOW();
  
  -- The Edge Function will be called from the client side
  -- when sending messages, so we don't need to call it from the trigger
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) Drop the complex trigger and use the simple one
DROP TRIGGER IF EXISTS on_message_insert_with_notifications ON public.messages;
CREATE TRIGGER on_message_insert_simple
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message_simple();

-- 6) Test the setup
SELECT 'Message trigger with notifications setup complete.' as status;
