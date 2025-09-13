-- Add platform_fee field to orders table
-- This ensures the platform fee is properly stored in the database

-- Add platform_fee column to the orders table if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;

-- Add comment to explain the field
COMMENT ON COLUMN public.orders.platform_fee IS 'Platform fee charged for all orders (currently ₦100)';

-- Update existing orders to have platform_fee = 0 if they don't have it set
UPDATE public.orders 
SET platform_fee = 0 
WHERE platform_fee IS NULL;

-- Add a check constraint to ensure platform_fee is not negative
ALTER TABLE public.orders 
ADD CONSTRAINT check_platform_fee_non_negative 
CHECK (platform_fee >= 0);

-- Note: This field will be populated when orders are created with platform_fee information
-- The checkout process now sends both platform_fee and shipping_fee to the backend
