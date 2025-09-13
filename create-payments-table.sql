-- Create payments table for tracking payment history and escrow management
-- This table tracks all payments in the marketplace including escrow, releases, and refunds

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id INTEGER NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  platform_fee NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  seller_payout NUMERIC NOT NULL, -- Amount seller will receive (amount - platform_fee)
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'released', 'refunded', 'cancelled')) DEFAULT 'pending',
  paystack_reference TEXT, -- Paystack transaction reference
  paystack_fee NUMERIC DEFAULT 0, -- Paystack processing fee
  verification_code TEXT, -- 6-digit OTP for pickup/delivery verification
  verification_expires_at TIMESTAMP, -- When verification code expires
  payment_method TEXT DEFAULT 'paystack',
  notes TEXT, -- Additional payment notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_buyer_id ON public.payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_seller_id ON public.payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_verification_code ON public.payments(verification_code);

-- Add verification code expiry index for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_payments_verification_expires ON public.payments(verification_expires_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view payments where they are either buyer or seller
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

-- Only system/service role can insert payments (via edge functions)
CREATE POLICY "Only service role can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- Only service role can update payments (via edge functions)
CREATE POLICY "Only service role can update payments" ON public.payments
  FOR UPDATE USING (
    auth.role() = 'service_role'
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on payments table
DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payments_updated_at();

-- Function to generate verification code and set expiry
CREATE OR REPLACE FUNCTION public.generate_verification_code(payment_id UUID)
RETURNS TEXT AS $$
DECLARE
  verification_code TEXT;
  expiry_time TIMESTAMP;
BEGIN
  -- Generate 6-digit random code
  verification_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Set expiry to 24 hours from now
  expiry_time := NOW() + INTERVAL '24 hours';
  
  -- Update the payment with verification code and expiry
  UPDATE public.payments 
  SET 
    verification_code = verification_code,
    verification_expires_at = expiry_time
  WHERE id = payment_id;
  
  RETURN verification_code;
END;
$$ LANGUAGE plpgsql;

-- Function to verify code and mark as delivered
CREATE OR REPLACE FUNCTION public.verify_payment_code(payment_id UUID, code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  payment_record RECORD;
  is_valid BOOLEAN := FALSE;
BEGIN
  -- Get payment details
  SELECT * INTO payment_record 
  FROM public.payments 
  WHERE id = payment_id;
  
  -- Check if code matches and hasn't expired
  IF payment_record.verification_code = code 
     AND payment_record.verification_expires_at > NOW()
     AND payment_record.status = 'paid' THEN
    
    -- Update payment status to released
    UPDATE public.payments 
    SET 
      status = 'released',
      released_at = NOW()
    WHERE id = payment_id;
    
    -- Update order status to delivered
    UPDATE public.orders 
    SET status = 'delivered'
    WHERE id = payment_record.order_id;
    
    is_valid := TRUE;
  END IF;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Function to handle automatic refunds for expired orders
CREATE OR REPLACE FUNCTION public.handle_expired_orders()
RETURNS VOID AS $$
BEGIN
  -- Mark orders as cancelled if seller doesn't confirm within 12 hours
  UPDATE public.orders 
  SET status = 'cancelled'
  WHERE status = 'awaiting_seller_confirmation' 
    AND created_at < NOW() - INTERVAL '12 hours';
  
  -- Mark payments as refunded for cancelled orders
  UPDATE public.payments 
  SET 
    status = 'refunded',
    refunded_at = NOW()
  WHERE status = 'paid' 
    AND order_id IN (
      SELECT id FROM public.orders 
      WHERE status = 'cancelled'
    );
  
  -- Clean up expired verification codes (older than 24 hours)
  UPDATE public.payments 
  SET 
    verification_code = NULL,
    verification_expires_at = NULL
  WHERE verification_expires_at < NOW() 
    AND status = 'paid';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE public.payments IS 'Tracks all payments in the marketplace including escrow, releases, and refunds';
COMMENT ON COLUMN public.payments.verification_code IS '6-digit OTP for pickup/delivery verification';
COMMENT ON COLUMN public.payments.verification_expires_at IS 'When verification code expires (24 hours)';
COMMENT ON COLUMN public.payments.seller_payout IS 'Amount seller will receive (total - platform_fee)';
COMMENT ON COLUMN public.payments.status IS 'Payment status: pending -> paid -> released/refunded';
