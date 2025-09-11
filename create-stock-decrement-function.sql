-- Create a function to decrement stock for a specific order
-- This function will be called by the edge function after order creation

CREATE OR REPLACE FUNCTION public.decrement_order_stock(order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_products JSON;
BEGIN
  -- Decrement stock for all items in the order
  UPDATE products 
  SET 
    stock_quantity = stock_quantity - oi.quantity,
    in_stock = CASE WHEN (stock_quantity - oi.quantity) > 0 THEN true ELSE false END
  FROM order_items oi
  WHERE products.id = oi.product_id 
  AND oi.order_id = decrement_order_stock.order_id
  AND products.stock_quantity >= oi.quantity;
  
  -- Get the updated products for logging
  SELECT json_agg(
    json_build_object(
      'product_id', p.id,
      'product_name', p.name,
      'new_stock_quantity', p.stock_quantity,
      'in_stock', p.in_stock
    )
  ) INTO updated_products
  FROM products p
  JOIN order_items oi ON p.id = oi.product_id
  WHERE oi.order_id = decrement_order_stock.order_id;
  
  -- Return the updated products info
  RETURN COALESCE(updated_products, '[]'::json);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_order_stock(UUID) TO authenticated;

-- Helper to send a push to a specific user by profile id
-- Expects: title text, body text, toUserId uuid, data json
CREATE OR REPLACE FUNCTION public.send_user_push(
  title text,
  body text,
  "toUserId" uuid,
  data json
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  push_token text;
BEGIN
  SELECT expo_push_token INTO push_token FROM public.profiles WHERE id = "toUserId";
  IF push_token IS NULL THEN
    RETURN;
  END IF;

  PERFORM
    http( 'POST', 'https://exp.host/--/api/v2/push/send',
      ARRAY[ http_header('Content-Type','application/json') ],
      json_build_object(
        'to', push_token,
        'title', title,
        'body', body,
        'data', data,
        'sound', 'default'
      )::text
    )
  FROM (SELECT 1) AS _;
END;
$$;
