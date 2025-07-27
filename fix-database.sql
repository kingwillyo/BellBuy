-- Fix database schema for smart checkout
-- Run this in your Supabase Dashboard → SQL Editor

-- Add reference column to orders table if it doesn't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reference TEXT;

-- Add missing columns to orders table if they don't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 200;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_payout NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create cart_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cart_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_purchase NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders table (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can view their own orders') THEN
        CREATE POLICY "Users can view their own orders" ON public.orders
            FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can insert their own orders') THEN
        CREATE POLICY "Users can insert their own orders" ON public.orders
            FOR INSERT WITH CHECK (auth.uid() = buyer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can update their own orders') THEN
        CREATE POLICY "Users can update their own orders" ON public.orders
            FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
    END IF;
END $$;

-- Enable RLS on cart_items table
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create policies for cart_items table (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can view their own cart items') THEN
        CREATE POLICY "Users can view their own cart items" ON public.cart_items
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can insert their own cart items') THEN
        CREATE POLICY "Users can insert their own cart items" ON public.cart_items
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can update their own cart items') THEN
        CREATE POLICY "Users can update their own cart items" ON public.cart_items
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can delete their own cart items') THEN
        CREATE POLICY "Users can delete their own cart items" ON public.cart_items
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Enable RLS on order_items table
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for order_items table (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can view order items for their orders') THEN
        CREATE POLICY "Users can view order items for their orders" ON public.order_items
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM orders 
                    WHERE orders.id = order_items.order_id 
                    AND (auth.uid() = orders.buyer_id OR auth.uid() = orders.seller_id)
                )
            );
    END IF;
END $$;

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS cart_items_user_id_idx ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id); 