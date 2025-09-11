-- Add last_login tracking to profiles table
-- Run this in Supabase SQL Editor

-- Add last_login column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- Create function to update last_login on auth
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger AS $$
BEGIN
  -- Update last_login when user signs in
  UPDATE public.profiles 
  SET last_login = NOW() 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for login events
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE PROCEDURE public.update_last_login();

-- Set initial last_login for existing users (use created_at as fallback)
UPDATE public.profiles 
SET last_login = created_at 
WHERE last_login IS NULL;
