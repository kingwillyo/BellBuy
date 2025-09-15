-- Fix RLS policies for conversations table to allow product_id insertion and updates
-- This migration updates the conversations table policies to properly handle product_id

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;

-- Create a new insert policy that allows product_id
CREATE POLICY "Users can insert conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        (product_id IS NULL OR EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = conversations.product_id
        ))
    );

-- Add UPDATE policy for conversations (this was missing!)
CREATE POLICY "Users can update conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        (product_id IS NULL OR EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = conversations.product_id
        ))
    );

-- Add comment to document the policies
COMMENT ON POLICY "Users can insert conversations" ON conversations IS 
'Allows authenticated users to create conversations. Product_id must reference an existing product or be NULL.';

COMMENT ON POLICY "Users can update conversations" ON conversations IS 
'Allows authenticated users to update conversations. Product_id must reference an existing product or be NULL.';
