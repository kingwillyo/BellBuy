-- Fix the relationship between orders and profiles tables
-- This script adds the missing foreign key constraints that Supabase needs for relationship queries

-- First, let's check if the orders table exists and what columns it has
-- If it doesn't exist, we'll need to create it with proper foreign key relationships

-- Check if orders table exists, if not create it
CREATE TABLE IF NOT EXISTS public.orders (
    id SERIAL PRIMARY KEY,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    product_id UUID,
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    seller_payout DECIMAL(10,2),
    payment_status TEXT DEFAULT 'pending',
    payout_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',
    reference TEXT,
    delivery_address TEXT,
    delivery_method TEXT,
    pickup_location TEXT,
    pickup_date DATE,
    pickup_time TIME,
    pickup_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints to link orders to profiles
-- First, add the constraints if they don't exist
DO $$ 
BEGIN
    -- Add foreign key constraint for buyer_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_buyer_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_buyer_id_fkey 
        FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key constraint for seller_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_seller_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for order_items table
DO $$ 
BEGIN
    -- Add foreign key constraint for order_id in order_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_items_order_id_fkey' 
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items 
        ADD CONSTRAINT order_items_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key constraint for product_id in order_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_items_product_id_fkey' 
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items 
        ADD CONSTRAINT order_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Enable Row Level Security on orders and order_items tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders table
DO $$ 
BEGIN
    -- Policy for buyers to see their own orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE polname = 'orders_select_buyer' 
        AND tablename = 'orders'
    ) THEN
        CREATE POLICY orders_select_buyer ON public.orders
            FOR SELECT USING (auth.uid() = buyer_id);
    END IF;

    -- Policy for sellers to see orders for their products
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE polname = 'orders_select_seller' 
        AND tablename = 'orders'
    ) THEN
        CREATE POLICY orders_select_seller ON public.orders
            FOR SELECT USING (auth.uid() = seller_id);
    END IF;

    -- Policy for buyers to insert their own orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE polname = 'orders_insert_buyer' 
        AND tablename = 'orders'
    ) THEN
        CREATE POLICY orders_insert_buyer ON public.orders
            FOR INSERT WITH CHECK (auth.uid() = buyer_id);
    END IF;

    -- Policy for sellers to update orders for their products
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE polname = 'orders_update_seller' 
        AND tablename = 'orders'
    ) THEN
        CREATE POLICY orders_update_seller ON public.orders
            FOR UPDATE USING (auth.uid() = seller_id);
    END IF;
END $$;

-- Create RLS policies for order_items table
DO $$ 
BEGIN
    -- Policy for buyers to see order items for their orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE polname = 'order_items_select_buyer' 
        AND tablename = 'order_items'
    ) THEN
        CREATE POLICY order_items_select_buyer ON public.order_items
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_items.order_id 
                    AND orders.buyer_id = auth.uid()
                )
            );
    END IF;

    -- Policy for sellers to see order items for their orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE polname = 'order_items_select_seller' 
        AND tablename = 'order_items'
    ) THEN
        CREATE POLICY order_items_select_seller ON public.order_items
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_items.order_id 
                    AND orders.seller_id = auth.uid()
                )
            );
    END IF;

    -- Policy for buyers to insert order items for their orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE polname = 'order_items_insert_buyer' 
        AND tablename = 'order_items'
    ) THEN
        CREATE POLICY order_items_insert_buyer ON public.order_items
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_items.order_id 
                    AND orders.buyer_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Add comments to explain the relationships
COMMENT ON COLUMN public.orders.buyer_id IS 'Foreign key reference to profiles table for the buyer';
COMMENT ON COLUMN public.orders.seller_id IS 'Foreign key reference to profiles table for the seller';
COMMENT ON COLUMN public.order_items.order_id IS 'Foreign key reference to orders table';
COMMENT ON COLUMN public.order_items.product_id IS 'Foreign key reference to products table';

-- Verify the relationships are working
-- These queries should work after running this script:

-- Test orders to profiles relationship:
-- SELECT o.*, p.full_name as buyer_name 
-- FROM orders o 
-- JOIN profiles p ON o.buyer_id = p.id 
-- WHERE o.seller_id = 'some-seller-id';

-- Test order_items to orders and products relationship:
-- SELECT oi.*, o.id as order_id, p.name as product_name
-- FROM order_items oi
-- JOIN orders o ON oi.order_id = o.id
-- JOIN products p ON oi.product_id = p.id
-- WHERE o.seller_id = 'some-seller-id';

-- Test the Supabase relationship query that was failing:
-- SELECT o.*, buyer:profiles!buyer_id (id, full_name, avatar_url, email)
-- FROM orders o
-- WHERE o.seller_id = 'some-seller-id';
