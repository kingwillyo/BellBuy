-- Fix conversations table RLS policies
-- Run this SQL directly in your Supabase SQL Editor

-- Add UPDATE policy for conversations (this was missing!)
CREATE POLICY "Users can update conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        (product_id IS NULL OR EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = conversations.product_id
        ))
    );

-- Add comment to document the policy
COMMENT ON POLICY "Users can update conversations" ON conversations IS 
'Allows authenticated users to update conversations. Product_id must reference an existing product or be NULL.';
