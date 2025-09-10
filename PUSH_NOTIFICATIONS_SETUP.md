# Push Notifications Setup for Messages

## Current Status

❌ **Push notifications are NOT working for new messages yet**

## What's Missing

1. Edge Function needs to be deployed
2. Database trigger needs to be updated
3. Client needs to call the notification function

## Setup Steps

### 1. Deploy the Edge Function

```bash
# Navigate to your project directory
cd /Volumes/ssd/Developer/Marketplace/Bells

# Deploy the send_message_notification function
supabase functions deploy send_message_notification
```

### 2. Update Database Trigger

Run `update-message-trigger-with-notifications.sql` in your Supabase SQL Editor.

### 3. Test the Setup

#### Test 1: Check if Edge Function is deployed

```bash
# Test the function directly
curl -X POST https://pdehjhhuceqmltpvosfh.supabase.co/functions/v1/send_message_notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "test-123",
    "conversation_id": "test-conv-123",
    "sender_id": "sender-123",
    "receiver_id": "receiver-123",
    "content": "Test message"
  }'
```

#### Test 2: Send a real message

1. Open the app on two different devices/accounts
2. Send a message from one account to another
3. Check if the receiver gets a push notification

### 4. Debugging

#### Check Edge Function Logs

1. Go to Supabase Dashboard → Functions → send_message_notification
2. Check the logs for any errors

#### Check Client Console

Look for these logs in your app:

- `"Message sent successfully: [...]"`
- `"Push notification sent successfully"`
- Any error messages

#### Check Database

```sql
-- Verify unread counts are being created
SELECT * FROM user_conversation_unread
ORDER BY created_at DESC
LIMIT 10;

-- Check if profiles have push tokens
SELECT id, full_name, expo_push_token IS NOT NULL as has_token
FROM profiles
WHERE expo_push_token IS NOT NULL;
```

## How It Works

1. **User sends message** → Client calls `supabase.from("messages").insert()`
2. **Database trigger fires** → Updates `user_conversation_unread` table
3. **Client calls Edge Function** → `supabase.functions.invoke('send_message_notification')`
4. **Edge Function sends push** → Uses Expo Push API to send notification
5. **Receiver gets notification** → Shows "New message from [Sender Name]"

## Troubleshooting

### No Push Token

- Check if `useAuth` hook is properly registering push tokens
- Verify permissions are granted for notifications
- Check if `expo_push_token` column exists in profiles table

### Edge Function Not Deployed

- Run `supabase functions deploy send_message_notification`
- Check Supabase dashboard for the function
- Verify function logs for errors

### Notifications Not Received

- Check if device has notifications enabled
- Verify Expo Push Token is valid
- Check Edge Function logs for API errors
- Test with Expo's push notification tool

### Database Issues

- Run the complete-unread-fix.sql script
- Check if triggers exist: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%message%';`
- Verify RLS policies allow the operations

## Next Steps After Setup

1. **Deploy the Edge Function** (most important)
2. **Update the database trigger**
3. **Test with real devices**
4. **Monitor logs for any issues**

Once deployed, push notifications should work automatically when users send messages!
