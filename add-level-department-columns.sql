-- Add Level and Department columns to profiles table
-- Run this in Supabase SQL Editor

-- Add level column (text field for academic level)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS level text;

-- Add department column (text field for academic department)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department text;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.level IS 'Academic level: 100, 200, 300, 400, 500, Postgraduate';
COMMENT ON COLUMN public.profiles.department IS 'Academic department or field of study';
