-- Enable Row Level Security on all tables
-- This migration implements server-side authorization for all database operations

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Products table policies
-- Users can view all products, but only update/delete their own
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON products
    FOR DELETE USING (auth.uid() = user_id);

-- Orders table policies
-- Users can only see orders where they are the buyer or seller
CREATE POLICY "Users can view own orders as buyer" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own orders as seller" ON orders
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Users can insert orders as buyer" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update orders as seller" ON orders
    FOR UPDATE USING (auth.uid() = seller_id);

-- Order items table policies
-- Users can only see order items for orders they own (as buyer or seller)
CREATE POLICY "Users can view order items for own orders" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR orders.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert order items for own orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Cart items table policies
-- Users can only see and modify their own cart items
CREATE POLICY "Users can view own cart items" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- Wishlist items table policies
-- Users can only see and modify their own wishlist items
CREATE POLICY "Users can view own wishlist items" ON wishlist_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items" ON wishlist_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items" ON wishlist_items
    FOR DELETE USING (auth.uid() = user_id);

-- Conversations table policies
-- Users can only see conversations they are part of
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can insert conversations as buyer" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Messages table policies
-- Users can only see messages in conversations they are part of
CREATE POLICY "Users can view messages in own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

-- Product reviews table policies
-- Users can only see reviews and create reviews for products they've purchased
CREATE POLICY "Anyone can view product reviews" ON product_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can insert reviews for purchased products" ON product_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = product_reviews.product_id
            AND o.user_id = auth.uid()
            AND o.status = 'delivered'
        )
    );

-- Universities table policies
-- Anyone can view universities (public data)
CREATE POLICY "Anyone can view universities" ON universities
    FOR SELECT USING (true);

-- Categories table policies
-- Anyone can view categories (public data)
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for system management
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all products" ON products
    FOR SELECT USING (is_admin(auth.uid()));

-- Create function to get user's total unread count (secure version)
CREATE OR REPLACE FUNCTION get_user_total_unread_count()
RETURNS INTEGER AS $$
DECLARE
    user_id UUID;
    unread_count INTEGER;
BEGIN
    -- Get the authenticated user's ID
    user_id := auth.uid();
    
    -- If no user is authenticated, return 0
    IF user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count unread messages for conversations where user is buyer or seller
    SELECT COUNT(*)
    INTO unread_count
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.buyer_id = user_id OR c.seller_id = user_id)
    AND m.sender_id != user_id
    AND m.read_at IS NULL;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_total_unread_count() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
