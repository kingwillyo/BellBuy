-- Seed 3 dummy reviews for the "Casio" watch product
-- Usage: Run this in your Supabase SQL editor (or psql) against your project.
-- Notes:
-- - This script ONLY inserts reviews for buyers who already have a delivered order
--   containing the Casio product. It respects your RLS policy.
-- - If fewer than 3 eligible delivered orders exist, it will insert as many as possible.

DO $$
DECLARE
  v_product_id uuid;
BEGIN
  -- 1) Find a product that looks like a Casio watch
  SELECT id INTO v_product_id
  FROM public.products
  WHERE lower(name) LIKE '%casio%'
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE NOTICE 'No product matching %%casio%% was found. Aborting seed.';
    RETURN;
  END IF;

  -- 2) Pick up to 3 delivered orders that include this product
  WITH eligible_orders AS (
    SELECT o.id AS order_id, o.buyer_id, oi.product_id,
           ROW_NUMBER() OVER (ORDER BY o.created_at DESC) AS rn
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.status = 'delivered'
      AND oi.product_id = v_product_id
    LIMIT 3
  ),
  dummy_text AS (
    SELECT * FROM (
      VALUES
        (1, 5, 'Fantastic quality and finish. Definitely worth the price.'),
        (2, 4, 'Great watch, battery life is solid. Strap could be softer.'),
        (3, 5, 'Exceeded expectations. Accurate time and looks premium!')
    ) AS t(rn, rating, body)
  )
  INSERT INTO public.product_reviews (product_id, user_id, order_id, rating, review_text, images)
  SELECT eo.product_id,
         eo.buyer_id,
         eo.order_id,
         dt.rating,
         dt.body,
         '[]'::jsonb
  FROM eligible_orders eo
  JOIN dummy_text dt USING (rn)
  ON CONFLICT (user_id, product_id, order_id) DO NOTHING;

  RAISE NOTICE 'Dummy Casio reviews seed executed.';
END$$;


