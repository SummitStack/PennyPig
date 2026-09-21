-- Seed additional default income categories (Salary already exists).

CREATE OR REPLACE FUNCTION public.ensure_user_defaults()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  needs_id uuid;
  wants_id uuid;
  savings_parent_id uuid;
  other_id uuid;
  living_id uuid;
  food_id uuid;
  transport_id uuid;
  entertainment_id uuid;
  shopping_id uuid;
  subscriptions_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  INSERT INTO public.users (id, email)
  VALUES (uid, COALESCE(uemail, ''))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.categories (user_id, name, type, color, icon, custom, sort_order, parent_id, is_system)
  VALUES
    (uid, 'Needs', 'expense', '#34d399', '📌', false, 10, NULL, true),
    (uid, 'Wants', 'expense', '#f472b6', '✨', false, 20, NULL, true),
    (uid, 'Savings Goals', 'expense', '#4ade80', '🎯', false, 30, NULL, true),
    (uid, 'Other', 'expense', '#94a3b8', '📦', false, 40, NULL, true)
  ON CONFLICT (user_id, name) DO UPDATE
    SET is_system = true,
        parent_id = NULL,
        icon = COALESCE(NULLIF(public.categories.icon, ''), EXCLUDED.icon),
        sort_order = EXCLUDED.sort_order,
        type = 'expense';

  SELECT id INTO needs_id FROM public.categories WHERE user_id = uid AND name = 'Needs';
  SELECT id INTO wants_id FROM public.categories WHERE user_id = uid AND name = 'Wants';
  SELECT id INTO savings_parent_id FROM public.categories WHERE user_id = uid AND name = 'Savings Goals' AND is_system = true;
  IF savings_parent_id IS NULL THEN
    SELECT id INTO savings_parent_id FROM public.categories WHERE user_id = uid AND name = 'Savings Goals';
  END IF;
  SELECT id INTO other_id FROM public.categories WHERE user_id = uid AND name = 'Other';

  INSERT INTO public.categories (user_id, name, type, color, icon, custom, sort_order, parent_id, is_system)
  VALUES
    (uid, 'Living', 'expense', '#34d399', '🏠', false, 11, needs_id, false),
    (uid, 'Transportation', 'expense', '#60a5fa', '🚗', false, 12, needs_id, false),
    (uid, 'Subscriptions', 'expense', '#c084fc', '📱', false, 13, needs_id, false),
    (uid, 'Food & Dining', 'expense', '#f472b6', '🍽️', false, 21, wants_id, false),
    (uid, 'Entertainment', 'expense', '#a78bfa', '🎬', false, 22, wants_id, false),
    (uid, 'Shopping', 'expense', '#fbbf24', '🛍️', false, 23, wants_id, false),
    (uid, 'Salary', 'income', '#4ade80', '💰', false, 100, NULL, false),
    (uid, 'Freelance', 'income', '#86efac', '💼', false, 101, NULL, false),
    (uid, 'Interest', 'income', '#bbf7d0', '📈', false, 102, NULL, false),
    (uid, 'Other Income', 'income', '#d9f99d', '🪙', false, 103, NULL, false)
  ON CONFLICT (user_id, name) DO UPDATE
    SET icon = COALESCE(NULLIF(public.categories.icon, ''), EXCLUDED.icon),
        sort_order = EXCLUDED.sort_order,
        type = EXCLUDED.type,
        parent_id = CASE
          WHEN public.categories.name IN ('Living', 'Transportation', 'Subscriptions')
            THEN needs_id
          WHEN public.categories.name IN ('Food & Dining', 'Entertainment', 'Shopping')
            THEN wants_id
          WHEN public.categories.type = 'income'
            THEN NULL
          ELSE public.categories.parent_id
        END;

  SELECT id INTO living_id FROM public.categories WHERE user_id = uid AND name = 'Living';
  SELECT id INTO food_id FROM public.categories WHERE user_id = uid AND name = 'Food & Dining';
  SELECT id INTO transport_id FROM public.categories WHERE user_id = uid AND name = 'Transportation';
  SELECT id INTO entertainment_id FROM public.categories WHERE user_id = uid AND name = 'Entertainment';
  SELECT id INTO shopping_id FROM public.categories WHERE user_id = uid AND name = 'Shopping';
  SELECT id INTO subscriptions_id FROM public.categories WHERE user_id = uid AND name = 'Subscriptions';

  INSERT INTO public.categories (user_id, name, type, color, icon, custom, sort_order, parent_id, is_system)
  VALUES
    (uid, 'Rent & Housing', 'expense', '#f87171', '🏡', false, 111, living_id, false),
    (uid, 'Utilities', 'expense', '#fbbf24', '💡', false, 112, living_id, false),
    (uid, 'Internet', 'expense', '#38bdf8', '📶', false, 113, living_id, false),
    (uid, 'Groceries', 'expense', '#4ade80', '🛒', false, 211, food_id, false),
    (uid, 'Dining', 'expense', '#f472b6', '🍝', false, 212, food_id, false),
    (uid, 'Coffee', 'expense', '#7bd0ff', '☕', false, 213, food_id, false),
    (uid, 'Gas', 'expense', '#fb923c', '⛽', false, 121, transport_id, false),
    (uid, 'Transit', 'expense', '#60a5fa', '🚌', false, 122, transport_id, false),
    (uid, 'Movies & Events', 'expense', '#a78bfa', '🎟️', false, 221, entertainment_id, false),
    (uid, 'Games', 'expense', '#c084fc', '🎮', false, 222, entertainment_id, false),
    (uid, 'Clothes', 'expense', '#fbbf24', '👕', false, 231, shopping_id, false),
    (uid, 'Household', 'expense', '#34d399', '🧹', false, 232, shopping_id, false),
    (uid, 'Streaming', 'expense', '#c084fc', '📺', false, 131, subscriptions_id, false),
    (uid, 'Software', 'expense', '#60a5fa', '💻', false, 132, subscriptions_id, false),
    (uid, 'Emergency Fund', 'expense', '#4ade80', '🛟', false, 311, savings_parent_id, false),
    (uid, 'Vacation', 'expense', '#38bdf8', '✈️', false, 312, savings_parent_id, false)
  ON CONFLICT (user_id, name) DO UPDATE
    SET parent_id = EXCLUDED.parent_id,
        icon = COALESCE(NULLIF(public.categories.icon, ''), EXCLUDED.icon),
        sort_order = EXCLUDED.sort_order;

  UPDATE public.categories
  SET parent_id = other_id
  WHERE user_id = uid
    AND type = 'expense'
    AND parent_id IS NULL
    AND is_system = false
    AND name NOT IN ('Needs', 'Wants', 'Savings Goals', 'Other');

  UPDATE public.categories
  SET parent_id = NULL, is_system = true
  WHERE user_id = uid
    AND name IN ('Needs', 'Wants', 'Savings Goals', 'Other');
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_defaults() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_defaults() TO authenticated;
