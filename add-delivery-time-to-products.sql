-- Add delivery_time field to products table
-- Run this in Supabase SQL Editor

-- Add delivery_time column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS delivery_time text;

-- Add a comment to describe the field
COMMENT ON COLUMN public.products.delivery_time IS 'Estimated delivery time (e.g., "2-3 days", "1 week", "Same day")';

-- Update existing products with a default delivery time (optional)
UPDATE public.products 
SET delivery_time = '2-3 days' 
WHERE delivery_time IS NULL;
