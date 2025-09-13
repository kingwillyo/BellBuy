-- Test script to verify the relationships are working
-- This will help us debug the issue

-- Check if foreign key constraints exist
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('orders', 'order_items')
ORDER BY tc.table_name, kcu.column_name;

-- Test the relationship query that should work
SELECT 
    o.id,
    o.buyer_id,
    o.seller_id,
    o.status,
    p.full_name as buyer_name,
    p.email as buyer_email
FROM orders o
LEFT JOIN profiles p ON o.buyer_id = p.id
LIMIT 5;

-- Check if there are any orders in the database
SELECT COUNT(*) as total_orders FROM orders;

-- Check if there are any profiles in the database  
SELECT COUNT(*) as total_profiles FROM profiles;
