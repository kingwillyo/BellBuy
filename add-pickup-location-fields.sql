-- Add pickup location fields to orders table
-- This allows sellers to set pickup location, date, and time when confirming orders with shipping

-- Add pickup location fields to the orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pickup_location TEXT,
ADD COLUMN IF NOT EXISTS pickup_date DATE,
ADD COLUMN IF NOT EXISTS pickup_time TIME,
ADD COLUMN IF NOT EXISTS pickup_notes TEXT;

-- Add comments to explain the new fields
COMMENT ON COLUMN public.orders.pickup_location IS 'Location where customer will pick up their order';
COMMENT ON COLUMN public.orders.pickup_date IS 'Date when customer can pick up their order';
COMMENT ON COLUMN public.orders.pickup_time IS 'Time when customer can pick up their order';
COMMENT ON COLUMN public.orders.pickup_notes IS 'Additional notes for pickup instructions';

-- Create an index for better query performance on pickup_date
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date ON public.orders(pickup_date);

-- Add a check constraint to ensure pickup_date is not in the past when set
ALTER TABLE public.orders 
ADD CONSTRAINT check_pickup_date_future 
CHECK (pickup_date IS NULL OR pickup_date >= CURRENT_DATE);

-- Add a check constraint to ensure pickup_time is valid when set
ALTER TABLE public.orders 
ADD CONSTRAINT check_pickup_time_valid 
CHECK (pickup_time IS NULL OR (pickup_time >= '00:00' AND pickup_time <= '23:59'));

-- Note: These fields will be populated when sellers confirm orders with shipping_fee > 0
-- The pickup confirmation screen will collect this information before confirming the order
