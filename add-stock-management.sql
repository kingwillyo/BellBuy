-- Add stock management columns to products table
-- This migration adds stock_quantity and in_stock columns to support inventory management

-- Add stock_quantity column (integer, default 1)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 1;

-- Add in_stock column (boolean, default true)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true;

-- Add check constraint to ensure stock_quantity is non-negative
ALTER TABLE public.products 
ADD CONSTRAINT IF NOT EXISTS check_stock_quantity_non_negative 
CHECK (stock_quantity >= 0);

-- Create an index on in_stock for better query performance
CREATE INDEX IF NOT EXISTS idx_products_in_stock 
ON public.products(in_stock) 
WHERE in_stock = true;

-- Create an index on stock_quantity for better query performance
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity 
ON public.products(stock_quantity) 
WHERE stock_quantity > 0;

-- Update existing products to have default stock values
UPDATE public.products 
SET stock_quantity = 1, in_stock = true 
WHERE stock_quantity IS NULL OR in_stock IS NULL;

-- Create a function to automatically update in_stock based on stock_quantity
CREATE OR REPLACE FUNCTION public.update_in_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-update in_stock if stock_quantity changed and in_stock wasn't explicitly set to false
  -- This allows manual control of in_stock while still auto-updating when stock changes
  IF OLD.stock_quantity != NEW.stock_quantity THEN
    -- If stock_quantity increased from 0, set in_stock to true
    IF OLD.stock_quantity = 0 AND NEW.stock_quantity > 0 THEN
      NEW.in_stock = true;
    -- If stock_quantity decreased to 0, set in_stock to false
    ELSIF NEW.stock_quantity = 0 THEN
      NEW.in_stock = false;
    -- If stock_quantity changed but both old and new are > 0, keep current in_stock value
    -- (This allows manual control when stock is available)
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update in_stock when stock_quantity changes
DROP TRIGGER IF EXISTS trigger_update_in_stock ON public.products;
CREATE TRIGGER trigger_update_in_stock
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_in_stock_status();

-- Create a function to decrement stock when an order is completed
CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement stock when order is created with 'paid' payment status
  -- or when order status changes to 'confirmed'
  IF (TG_OP = 'INSERT' AND NEW.payment_status = 'paid') OR
     (TG_OP = 'UPDATE' AND OLD.payment_status != 'paid' AND NEW.payment_status = 'paid') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
    -- Decrement stock for each item in the order
    UPDATE public.products 
    SET stock_quantity = stock_quantity - oi.quantity
    FROM public.order_items oi
    WHERE products.id = oi.product_id 
    AND oi.order_id = NEW.id
    AND products.stock_quantity >= oi.quantity;
    
    -- Check if any products went out of stock
    UPDATE public.products 
    SET in_stock = false
    WHERE stock_quantity <= 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to decrement stock when order is created or confirmed
DROP TRIGGER IF EXISTS trigger_decrement_stock ON public.orders;
CREATE TRIGGER trigger_decrement_stock
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_product_stock();

-- Add RLS policies for the new columns (if RLS is enabled)
-- These policies ensure users can only see and modify their own products' stock
DO $$ 
BEGIN
  -- Check if RLS is enabled on products table
  IF EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'products' 
    AND relrowsecurity = true
  ) THEN
    -- Policy for selecting products (everyone can see stock info)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'products' 
      AND policyname = 'products_select_stock'
    ) THEN
      CREATE POLICY products_select_stock ON public.products
        FOR SELECT USING (true);
    END IF;
    
    -- Policy for updating stock (only product owners can update)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'products' 
      AND policyname = 'products_update_stock'
    ) THEN
      CREATE POLICY products_update_stock ON public.products
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;
