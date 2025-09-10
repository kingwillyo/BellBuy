-- Debug script to check if unread trigger is working
-- ==========================================================

-- 1) Check if the trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_message_insert_unread_per_user';

-- 2) Check if the function exists
SELECT 
  routine_name, 
  routine_type, 
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_message_per_user';

-- 3) Test the trigger manually (replace with actual conversation_id and user_id)
-- First, let's see what conversations exist
SELECT id, created_at FROM conversations LIMIT 5;

-- 4) Check if user_conversation_unread table exists and has data
SELECT COUNT(*) as total_rows FROM user_conversation_unread;

-- 5) Check recent messages to see if trigger should have fired
SELECT 
  id, 
  conversation_id, 
  sender_id, 
  receiver_id, 
  content, 
  created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 6) Check if there are any unread records for recent conversations
SELECT 
  ucu.*,
  c.created_at as conversation_created
FROM user_conversation_unread ucu
JOIN conversations c ON c.id = ucu.conversation_id
ORDER BY ucu.created_at DESC
LIMIT 10;
