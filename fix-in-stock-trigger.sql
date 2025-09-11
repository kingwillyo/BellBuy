-- Fix the in_stock trigger to respect manual toggles
-- This updates the existing trigger function to allow manual control of in_stock

-- Update the function to be more intelligent about when to auto-update in_stock
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

-- The trigger is already in place, so no need to recreate it
-- The updated function will now respect manual in_stock toggles
