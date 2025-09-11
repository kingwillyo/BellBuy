-- Fix the stock decrement trigger to work with the current order creation process
-- This updates the existing trigger to decrement stock when orders are created with 'paid' status

-- Update the function to decrement stock when order is created with 'paid' payment status
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

-- Update the trigger to fire on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_decrement_stock ON public.orders;
CREATE TRIGGER trigger_decrement_stock
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_product_stock();

-- Note: This will now decrement stock when:
-- 1. Orders are created with payment_status = 'paid' (current checkout flow)
-- 2. Orders are updated to status = 'confirmed' (if that happens later)
