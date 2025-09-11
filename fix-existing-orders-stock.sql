-- Fix stock for existing orders that were placed before the stock decrement was working
-- This script will decrement stock for all existing orders

-- First, let's see what orders exist and their items
-- SELECT o.id, o.status, o.payment_status, oi.product_id, oi.quantity, p.name, p.stock_quantity
-- FROM orders o
-- JOIN order_items oi ON o.id = oi.order_id
-- JOIN products p ON oi.product_id = p.id
-- ORDER BY o.created_at DESC;

-- Decrement stock for all existing orders
UPDATE products 
SET 
  stock_quantity = stock_quantity - oi.quantity,
  in_stock = CASE WHEN (stock_quantity - oi.quantity) > 0 THEN true ELSE false END
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE products.id = oi.product_id
AND o.payment_status = 'paid'
AND products.stock_quantity >= oi.quantity;

-- Show updated stock quantities
SELECT 
  p.id,
  p.name,
  p.stock_quantity,
  p.in_stock,
  COUNT(oi.id) as total_orders
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
GROUP BY p.id, p.name, p.stock_quantity, p.in_stock
ORDER BY p.name;
