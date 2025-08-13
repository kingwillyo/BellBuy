-- Add delivery_address column to orders table
-- This migration adds the missing delivery_address column that the edge function expects

-- Add the delivery_address column
ALTER TABLE public.orders 
ADD COLUMN delivery_address TEXT DEFAULT 'Male Bronze 2 Annex';

-- Add a comment to document the column
COMMENT ON COLUMN public.orders.delivery_address IS 'Delivery address for the order, fetched from buyer profile';

-- Create an index for better performance when querying by delivery address
CREATE INDEX IF NOT EXISTS orders_delivery_address_idx ON public.orders(delivery_address);

-- Update existing orders to have a default delivery address if they don't have one
UPDATE public.orders 
SET delivery_address = 'Male Bronze 2 Annex' 
WHERE delivery_address IS NULL;
