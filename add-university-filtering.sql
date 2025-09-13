-- Add university-based filtering to the marketplace
-- This migration adds university support to profiles and products tables

-- 1. Create universities table
CREATE TABLE IF NOT EXISTS public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert Bells University as the default university
INSERT INTO public.universities (name) 
VALUES ('Bells University') 
ON CONFLICT (name) DO NOTHING;

-- 3. Add university_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id);

-- 4. Add university_id column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id);

-- 5. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_university_id 
ON public.profiles(university_id);

CREATE INDEX IF NOT EXISTS idx_products_university_id 
ON public.products(university_id);

-- 6. Update existing profiles to have Bells University as default
UPDATE public.profiles 
SET university_id = (SELECT id FROM public.universities WHERE name = 'Bells University')
WHERE university_id IS NULL;

-- 7. Update existing products to have Bells University as default
UPDATE public.products 
SET university_id = (SELECT id FROM public.universities WHERE name = 'Bells University')
WHERE university_id IS NULL;

-- 8. Update the handle_new_user function to include university_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name text;
  v_gender text;
  v_hostel text;
  v_phone text;
  v_university_id uuid;
BEGIN
  -- pull user_metadata values when present
  v_full_name := coalesce((new.raw_user_meta_data ->> 'full_name'), null);
  v_gender := coalesce((new.raw_user_meta_data ->> 'gender'), null);
  v_hostel := coalesce((new.raw_user_meta_data ->> 'hostel'), null);
  v_phone := coalesce((new.raw_user_meta_data ->> 'phone'), null);
  v_university_id := coalesce((new.raw_user_meta_data ->> 'university_id')::uuid, null);

  -- If no university_id provided, default to Bells University
  IF v_university_id IS NULL THEN
    SELECT id INTO v_university_id FROM public.universities WHERE name = 'Bells University';
  END IF;

  insert into public.profiles (id, email, full_name, gender, hostel, phone, university_id)
  values (new.id, new.email, v_full_name, v_gender, v_hostel, v_phone, v_university_id)
  on conflict (id) do nothing;
  return new;
END;
$$ language plpgsql security definer set search_path = public;

-- 9. Update the create_profile_if_not_exists function to include university_id
CREATE OR REPLACE FUNCTION public.create_profile_if_not_exists(
  p_full_name text,
  p_gender text,
  p_university_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_university_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If no university_id provided, default to Bells University
  IF p_university_id IS NULL THEN
    SELECT id INTO v_university_id FROM public.universities WHERE name = 'Bells University';
  ELSE
    v_university_id := p_university_id;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, gender, university_id)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    p_full_name,
    p_gender,
    v_university_id
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = excluded.full_name,
    gender = excluded.gender,
    university_id = excluded.university_id;
END;
$$;

-- 10. Create a function to automatically set university_id for new products
CREATE OR REPLACE FUNCTION public.set_product_university()
RETURNS TRIGGER AS $$
DECLARE
  v_university_id uuid;
BEGIN
  -- Get the university_id from the user's profile
  SELECT university_id INTO v_university_id 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- Set the product's university_id
  NEW.university_id := v_university_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to automatically set university_id for new products
DROP TRIGGER IF EXISTS trg_set_product_university ON public.products;
CREATE TRIGGER trg_set_product_university
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_product_university();

-- 12. Add RLS policies for universities table
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read universities
CREATE POLICY IF NOT EXISTS universities_select_all ON public.universities
  FOR SELECT USING (true);

-- 13. Add comments for documentation
COMMENT ON TABLE public.universities IS 'Universities available in the marketplace';
COMMENT ON COLUMN public.profiles.university_id IS 'University the user belongs to';
COMMENT ON COLUMN public.products.university_id IS 'University the product belongs to (inherited from seller)';
