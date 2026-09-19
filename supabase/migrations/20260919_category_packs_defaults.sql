-- Refresh default category seed to Housing / Utilities / Food core packs.
-- Suggested packs are added from the app UI (categoryPacks.js), not here.

CREATE OR REPLACE FUNCTION public.ensure_user_defaults()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  housing_id uuid;
  utilities_id uuid;
  food_id uuid;
  transport_id uuid;
  savings_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  INSERT INTO public.users (id, email)
  VALUES (uid, COALESCE(uemail, ''))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Core parent groups + income
  INSERT INTO public.categories (user_id, name, type, color, icon, custom, sort_order, parent_id)
  VALUES
    (uid, 'Housing', 'expense', '#34d399', '🏠', false, 10, NULL),
    (uid, 'Utilities', 'expense', '#fbbf24', '💡', false, 20, NULL),
    (uid, 'Groceries & Food', 'expense', '#f472b6', '🍽️', false, 30, NULL),
    (uid, 'Transportation', 'expense', '#60a5fa', '🚗', false, 40, NULL),
    (uid, 'Savings Goals', 'expense', '#4ade80', '🎯', false, 90, NULL),
    (uid, 'Salary', 'income', '#4ade80', '💰', false, 100, NULL)
  ON CONFLICT (user_id, name) DO UPDATE
    SET icon = COALESCE(NULLIF(public.categories.icon, ''), EXCLUDED.icon),
        sort_order = EXCLUDED.sort_order,
        type = EXCLUDED.type,
        color = EXCLUDED.color;

  SELECT id INTO housing_id FROM public.categories WHERE user_id = uid AND name = 'Housing';
  SELECT id INTO utilities_id FROM public.categories WHERE user_id = uid AND name = 'Utilities';
  SELECT id INTO food_id FROM public.categories WHERE user_id = uid AND name = 'Groceries & Food';
  SELECT id INTO transport_id FROM public.categories WHERE user_id = uid AND name = 'Transportation';
  SELECT id INTO savings_id FROM public.categories WHERE user_id = uid AND name = 'Savings Goals';

  INSERT INTO public.categories (user_id, name, type, color, icon, custom, sort_order, parent_id)
  VALUES
    -- Housing
    (uid, 'Rent/Mortgage', 'expense', '#f87171', '🏡', false, 11, housing_id),
    (uid, 'Home Insurance', 'expense', '#34d399', '🛡️', false, 12, housing_id),
    (uid, 'Home Maintenance & Repairs', 'expense', '#fb923c', '🔧', false, 13, housing_id),
    -- Utilities
    (uid, 'Electricity', 'expense', '#fbbf24', '⚡', false, 21, utilities_id),
    (uid, 'Water/Sewer', 'expense', '#38bdf8', '💧', false, 22, utilities_id),
    (uid, 'Natural Gas', 'expense', '#fb923c', '🔥', false, 23, utilities_id),
    (uid, 'Internet/Phone', 'expense', '#60a5fa', '📶', false, 24, utilities_id),
    (uid, 'Subscriptions', 'expense', '#c084fc', '📱', false, 25, utilities_id),
    -- Food
    (uid, 'Groceries', 'expense', '#4ade80', '🛒', false, 31, food_id),
    (uid, 'Restaurants & Dining Out', 'expense', '#f472b6', '🍝', false, 32, food_id),
    (uid, 'Coffee/Café', 'expense', '#7bd0ff', '☕', false, 33, food_id),
    -- Transport
    (uid, 'Gas/Fuel', 'expense', '#fb923c', '⛽', false, 41, transport_id),
    (uid, 'Car Insurance', 'expense', '#60a5fa', '📋', false, 42, transport_id),
    (uid, 'Public Transit', 'expense', '#38bdf8', '🚌', false, 43, transport_id),
    -- Savings (starter goals; more via packs UI)
    (uid, 'Emergency Fund', 'expense', '#4ade80', '🛟', false, 91, savings_id),
    (uid, 'Vacation Fund', 'expense', '#38bdf8', '🏖️', false, 92, savings_id)
  ON CONFLICT (user_id, name) DO UPDATE
    SET parent_id = COALESCE(EXCLUDED.parent_id, public.categories.parent_id),
        icon = COALESCE(NULLIF(public.categories.icon, ''), EXCLUDED.icon),
        sort_order = EXCLUDED.sort_order;

  -- Keep core groups top-level
  UPDATE public.categories SET icon = '🏠', parent_id = NULL, sort_order = 10
    WHERE user_id = uid AND name = 'Housing';
  UPDATE public.categories SET icon = '💡', parent_id = NULL, sort_order = 20
    WHERE user_id = uid AND name = 'Utilities';
  UPDATE public.categories SET icon = '🍽️', parent_id = NULL, sort_order = 30
    WHERE user_id = uid AND name = 'Groceries & Food';
  UPDATE public.categories SET icon = '🚗', parent_id = NULL, sort_order = 40
    WHERE user_id = uid AND name = 'Transportation';
  UPDATE public.categories SET icon = '🎯', parent_id = NULL, sort_order = 90
    WHERE user_id = uid AND name = 'Savings Goals';
  UPDATE public.categories SET icon = '💰', parent_id = NULL, sort_order = 100
    WHERE user_id = uid AND name = 'Salary';

  -- Soft-migrate legacy group names → new taxonomy when the new group exists
  -- and the old group has no unique meaning left (children re-homed by name upserts).
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_defaults() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_defaults() TO authenticated;
