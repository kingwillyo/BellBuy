-- Add delivery_address column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Add index for delivery_address for better performance
CREATE INDEX IF NOT EXISTS orders_delivery_address_idx ON public.orders(delivery_address);

-- Update existing orders to have a default delivery address if they don't have one
UPDATE public.orders 
SET delivery_address = 'Male Bronze 2 Annex' 
WHERE delivery_address IS NULL; 