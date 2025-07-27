-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    hostel TEXT NOT NULL,
    phone TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Optional: Create an index on hostel for filtering
CREATE INDEX IF NOT EXISTS profiles_hostel_idx ON public.profiles(hostel); 

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_amount NUMERIC NOT NULL,
    shipping_fee NUMERIC DEFAULT 200,
    seller_payout NUMERIC NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid', 'failed')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'shipped', 'delivered')),
    reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create order_items table
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

-- Create policies for orders table
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Enable RLS on cart_items table
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create policies for cart_items table
CREATE POLICY "Users can view their own cart items" ON public.cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items" ON public.cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" ON public.cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" ON public.cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on order_items table
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for order_items table
CREATE POLICY "Users can view order items for their orders" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (auth.uid() = orders.buyer_id OR auth.uid() = orders.seller_id)
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS cart_items_user_id_idx ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id); 