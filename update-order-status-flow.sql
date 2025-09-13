-- Update orders table to support the new payment flow
-- This adds new statuses and fields needed for the escrow payment system

-- Add new fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS verification_code TEXT,
ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id);

-- Add comments for new fields
COMMENT ON COLUMN public.orders.verification_code IS '6-digit OTP for pickup/delivery verification (moved from payments for easier access)';
COMMENT ON COLUMN public.orders.verification_expires_at IS 'When verification code expires (24 hours)';
COMMENT ON COLUMN public.orders.confirmation_deadline IS 'Deadline for seller to confirm order (12 hours)';
COMMENT ON COLUMN public.orders.payment_id IS 'Reference to payment record in payments table';

-- Update the order status check constraint to include new statuses
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending_payment',           -- Order created, awaiting payment
  'paid',                      -- Payment successful, awaiting seller confirmation
  'awaiting_seller_confirmation', -- Payment confirmed, seller has 12 hours to confirm
  'confirmed',                 -- Seller confirmed, ready for pickup/delivery
  'delivered',                 -- Order completed successfully
  'cancelled',                 -- Order cancelled (various reasons)
  'refunded'                   -- Order refunded
));

-- Update payment_status constraint to match new flow
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN (
  'pending',    -- Payment not yet processed
  'paid',       -- Payment successful via Paystack
  'failed',     -- Payment failed
  'refunded'    -- Payment refunded
));

-- Function to create order with pending_payment status
CREATE OR REPLACE FUNCTION public.create_pending_order(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_total_amount NUMERIC,
  p_platform_fee NUMERIC,
  p_shipping_fee NUMERIC,
  p_delivery_method TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  order_id INTEGER;
  confirmation_deadline TIMESTAMP;
BEGIN
  -- Set confirmation deadline to 12 hours from now
  confirmation_deadline := NOW() + INTERVAL '12 hours';
  
  -- Create order with pending_payment status
  INSERT INTO public.orders (
    buyer_id,
    seller_id,
    total_amount,
    platform_fee,
    shipping_fee,
    delivery_method,
    delivery_address,
    reference,
    status,
    payment_status,
    confirmation_deadline,
    created_at,
    updated_at
  ) VALUES (
    p_buyer_id,
    p_seller_id,
    p_total_amount,
    p_platform_fee,
    p_shipping_fee,
    p_delivery_method,
    p_delivery_address,
    p_reference,
    'pending_payment',
    'pending',
    confirmation_deadline,
    NOW(),
    NOW()
  ) RETURNING id INTO order_id;
  
  RETURN order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark order as paid and create payment record
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_order_id INTEGER,
  p_paystack_reference TEXT
)
RETURNS UUID AS $$
DECLARE
  payment_id UUID;
  order_record RECORD;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM public.orders WHERE id = p_order_id;
  
  -- Create payment record
  INSERT INTO public.payments (
    order_id,
    buyer_id,
    seller_id,
    amount,
    platform_fee,
    shipping_fee,
    seller_payout,
    status,
    paystack_reference,
    payment_method,
    created_at,
    paid_at
  ) VALUES (
    p_order_id,
    order_record.buyer_id,
    order_record.seller_id,
    order_record.total_amount,
    order_record.platform_fee,
    order_record.shipping_fee,
    order_record.total_amount - order_record.platform_fee,
    'paid',
    p_paystack_reference,
    'paystack',
    NOW(),
    NOW()
  ) RETURNING id INTO payment_id;
  
  -- Update order status
  UPDATE public.orders 
  SET 
    status = 'awaiting_seller_confirmation',
    payment_status = 'paid',
    payment_id = payment_id,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate verification code when seller confirms
CREATE OR REPLACE FUNCTION public.seller_confirm_order(
  p_order_id INTEGER
)
RETURNS TEXT AS $$
DECLARE
  verification_code TEXT;
  expiry_time TIMESTAMP;
BEGIN
  -- Generate 6-digit random code
  verification_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Set expiry to 24 hours from now
  expiry_time := NOW() + INTERVAL '24 hours';
  
  -- Update order with verification code and confirm
  UPDATE public.orders 
  SET 
    status = 'confirmed',
    verification_code = verification_code,
    verification_expires_at = expiry_time,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Update payment record
  UPDATE public.payments 
  SET 
    verification_code = verification_code,
    verification_expires_at = expiry_time,
    updated_at = NOW()
  WHERE order_id = p_order_id;
  
  RETURN verification_code;
END;
$$ LANGUAGE plpgsql;

-- Function to verify pickup/delivery code
CREATE OR REPLACE FUNCTION public.verify_delivery_code(
  p_order_id INTEGER,
  p_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  order_record RECORD;
  is_valid BOOLEAN := FALSE;
BEGIN
  -- Get order details
  SELECT * INTO order_record 
  FROM public.orders 
  WHERE id = p_order_id;
  
  -- Check if code matches and hasn't expired
  IF order_record.verification_code = p_code 
     AND order_record.verification_expires_at > NOW()
     AND order_record.status = 'confirmed' THEN
    
    -- Update order status to delivered
    UPDATE public.orders 
    SET 
      status = 'delivered',
      updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Update payment status to released
    UPDATE public.payments 
    SET 
      status = 'released',
      released_at = NOW(),
      updated_at = NOW()
    WHERE order_id = p_order_id;
    
    is_valid := TRUE;
  END IF;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Function to handle automatic refunds and cancellations
CREATE OR REPLACE FUNCTION public.handle_expired_orders_cron()
RETURNS VOID AS $$
BEGIN
  -- Mark orders as cancelled if seller doesn't confirm within 12 hours
  UPDATE public.orders 
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE status = 'awaiting_seller_confirmation' 
    AND confirmation_deadline < NOW();
  
  -- Mark payments as refunded for cancelled orders
  UPDATE public.payments 
  SET 
    status = 'refunded',
    refunded_at = NOW(),
    updated_at = NOW()
  WHERE status = 'paid' 
    AND order_id IN (
      SELECT id FROM public.orders 
      WHERE status = 'cancelled'
    );
  
  -- Clean up expired verification codes (older than 24 hours)
  UPDATE public.orders 
  SET 
    verification_code = NULL,
    verification_expires_at = NULL,
    updated_at = NOW()
  WHERE verification_expires_at < NOW() 
    AND status = 'confirmed';
    
  UPDATE public.payments 
  SET 
    verification_code = NULL,
    verification_expires_at = NULL,
    updated_at = NOW()
  WHERE verification_expires_at < NOW() 
    AND status = 'paid';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_orders_verification_code ON public.orders(verification_code);
CREATE INDEX IF NOT EXISTS idx_orders_confirmation_deadline ON public.orders(confirmation_deadline);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON public.orders(payment_id);

-- Add comments
COMMENT ON FUNCTION public.create_pending_order IS 'Creates order with pending_payment status and 12-hour confirmation deadline';
COMMENT ON FUNCTION public.confirm_payment IS 'Marks order as paid and creates payment record';
COMMENT ON FUNCTION public.seller_confirm_order IS 'Generates verification code when seller confirms order';
COMMENT ON FUNCTION public.verify_delivery_code IS 'Verifies pickup/delivery code and marks order as delivered';
COMMENT ON FUNCTION public.handle_expired_orders_cron IS 'Handles automatic refunds and cleanup of expired orders';
