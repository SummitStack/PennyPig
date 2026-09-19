-- category_hierarchy_emoji
-- Add parent/child categories, sort order, emoji icons, and hierarchical seeds.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS categories_user_parent_idx
  ON public.categories (user_id, parent_id);

CREATE OR REPLACE FUNCTION public.ensure_user_defaults()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  living_id uuid;
  food_id uuid;
  transport_id uuid;
  entertainment_id uuid;
  shopping_id uuid;
  subscriptions_id uuid;
  savings_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  INSERT INTO public.users (id, email)
  VALUES (uid, COALESCE(uemail, ''))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Parent groups (+ income)
  INSERT INTO public.categories (user_id, name, type, color, icon, custom, sort_order, parent_id)
  VALUES
    (uid, 'Living', 'expense', '#34d399', '🏠', false, 10, NULL),
    (uid, 'Food & Dining', 'expense', '#f472b6', '🍽️', false, 20, NULL),
    (uid, 'Transportation', 'expense', '#60a5fa', '🚗', false, 30, NULL),
    (uid, 'Entertainment', 'expense', '#a78bfa', '🎬', false, 40, NULL),
    (uid, 'Shopping', 'expense', '#fbbf24', '🛍️', false, 50, NULL),
    (uid, 'Subscriptions', 'expense', '#c084fc', '📱', false, 60, NULL),
    (uid, 'Savings Goals', 'expense', '#4ade80', '🎯', false, 70, NULL),
    (uid, 'Salary', 'income', '#4ade80', '💰', false, 100, NULL)
  ON CONFLICT (user_id, name) DO UPDATE
    SET icon = COALESCE(NULLIF(public.categories.icon, ''), EXCLUDED.icon),
        sort_order = EXCLUDED.sort_order,
        type = EXCLUDED.type;

  SELECT id INTO living_id FROM public.categories WHERE user_id = uid AND name = 'Living';
  SELECT id INTO food_id FROM public.categories WHERE user_id = uid AND name = 'Food & Dining';
  SELECT id INTO transport_id FROM public.categories WHERE user_id = uid AND name = 'Transportation';
  SELECT id INTO entertainment_id FROM public.categories WHERE user_id = uid AND name = 'Entertainment';
  SELECT id INTO shopping_id FROM public.categories WHERE user_id = uid AND name = 'Shopping';
  SELECT id INTO subscriptions_id FROM public.categories WHERE user_id = uid AND name = 'Subscriptions';
  SELECT id INTO savings_id FROM public.categories WHERE user_id = uid AND name = 'Savings Goals';

  INSERT INTO public.categories (user_id, name, type, color, icon, custom, sort_order, parent_id)
  VALUES
    (uid, 'Rent & Housing', 'expense', '#f87171', '🏡', false, 11, living_id),
    (uid, 'Utilities', 'expense', '#fbbf24', '💡', false, 12, living_id),
    (uid, 'Internet', 'expense', '#38bdf8', '📶', false, 13, living_id),
    (uid, 'Groceries', 'expense', '#4ade80', '🛒', false, 21, food_id),
    (uid, 'Dining', 'expense', '#f472b6', '🍝', false, 22, food_id),
    (uid, 'Coffee', 'expense', '#7bd0ff', '☕', false, 23, food_id),
    (uid, 'Gas', 'expense', '#fb923c', '⛽', false, 31, transport_id),
    (uid, 'Transit', 'expense', '#60a5fa', '🚌', false, 32, transport_id),
    (uid, 'Movies & Events', 'expense', '#a78bfa', '🎟️', false, 41, entertainment_id),
    (uid, 'Games', 'expense', '#c084fc', '🎮', false, 42, entertainment_id),
    (uid, 'Clothes', 'expense', '#fbbf24', '👕', false, 51, shopping_id),
    (uid, 'Household', 'expense', '#34d399', '🧹', false, 52, shopping_id),
    (uid, 'Streaming', 'expense', '#c084fc', '📺', false, 61, subscriptions_id),
    (uid, 'Software', 'expense', '#60a5fa', '💻', false, 62, subscriptions_id),
    (uid, 'Emergency Fund', 'expense', '#4ade80', '🛟', false, 71, savings_id),
    (uid, 'Vacation', 'expense', '#38bdf8', '✈️', false, 72, savings_id)
  ON CONFLICT (user_id, name) DO UPDATE
    SET parent_id = EXCLUDED.parent_id,
        icon = COALESCE(NULLIF(public.categories.icon, ''), EXCLUDED.icon),
        sort_order = EXCLUDED.sort_order;

  -- Fold legacy flat "Rent" into "Rent & Housing" when unused
  UPDATE public.transactions t
  SET category_id = rh.id
  FROM public.categories rent
  JOIN public.categories rh
    ON rh.user_id = rent.user_id AND rh.name = 'Rent & Housing'
  WHERE rent.user_id = uid
    AND rent.name = 'Rent'
    AND t.category_id = rent.id;

  UPDATE public.budgets b
  SET category_id = rh.id
  FROM public.categories rent
  JOIN public.categories rh
    ON rh.user_id = rent.user_id AND rh.name = 'Rent & Housing'
  WHERE rent.user_id = uid
    AND rent.name = 'Rent'
    AND b.category_id = rent.id
    AND NOT EXISTS (
      SELECT 1 FROM public.budgets b2
      WHERE b2.user_id = uid
        AND b2.category_id = rh.id
        AND b2.month_year = b.month_year
    );

  DELETE FROM public.categories
  WHERE user_id = uid
    AND name = 'Rent'
    AND NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.category_id = categories.id)
    AND NOT EXISTS (SELECT 1 FROM public.budgets b WHERE b.category_id = categories.id);

  UPDATE public.categories
    SET parent_id = living_id,
        icon = COALESCE(NULLIF(icon, ''), '🏡'),
        sort_order = 11
    WHERE user_id = uid AND name = 'Rent' AND parent_id IS DISTINCT FROM living_id;

  UPDATE public.categories
    SET parent_id = food_id,
        icon = COALESCE(NULLIF(icon, ''), '🛒'),
        sort_order = 21
    WHERE user_id = uid AND name = 'Groceries' AND parent_id IS DISTINCT FROM food_id;

  UPDATE public.categories
    SET parent_id = food_id,
        icon = COALESCE(NULLIF(icon, ''), '🍝'),
        sort_order = 22
    WHERE user_id = uid AND name = 'Dining' AND parent_id IS DISTINCT FROM food_id;

  UPDATE public.categories
    SET parent_id = food_id,
        icon = COALESCE(NULLIF(icon, ''), '☕'),
        sort_order = 23
    WHERE user_id = uid AND name = 'Coffee' AND parent_id IS DISTINCT FROM food_id;

  UPDATE public.categories
    SET parent_id = transport_id,
        icon = COALESCE(NULLIF(icon, ''), '⛽'),
        sort_order = 31
    WHERE user_id = uid AND name = 'Gas' AND parent_id IS DISTINCT FROM transport_id;

  -- Ensure group rows stay top-level with emojis
  UPDATE public.categories SET icon = '🏠', parent_id = NULL, sort_order = 10
    WHERE user_id = uid AND name = 'Living';
  UPDATE public.categories SET icon = '🍽️', parent_id = NULL, sort_order = 20
    WHERE user_id = uid AND name = 'Food & Dining';
  UPDATE public.categories SET icon = '🚗', parent_id = NULL, sort_order = 30
    WHERE user_id = uid AND name = 'Transportation';
  UPDATE public.categories SET icon = '🎬', parent_id = NULL, sort_order = 40
    WHERE user_id = uid AND name = 'Entertainment';
  UPDATE public.categories SET icon = '🛍️', parent_id = NULL, sort_order = 50
    WHERE user_id = uid AND name = 'Shopping';
  UPDATE public.categories SET icon = '📱', parent_id = NULL, sort_order = 60
    WHERE user_id = uid AND name = 'Subscriptions';
  UPDATE public.categories SET icon = '🎯', parent_id = NULL, sort_order = 70
    WHERE user_id = uid AND name = 'Savings Goals';
  UPDATE public.categories SET icon = '💰', parent_id = NULL, sort_order = 100
    WHERE user_id = uid AND name = 'Salary';

  -- Move orphaned parent budgets onto the first child so totals stay accurate
  UPDATE public.budgets b
  SET category_id = child.id,
      updated_at = now()
  FROM public.categories parent
  JOIN LATERAL (
    SELECT c.id
    FROM public.categories c
    WHERE c.parent_id = parent.id
    ORDER BY c.sort_order, c.name
    LIMIT 1
  ) child ON true
  WHERE parent.user_id = uid
    AND b.user_id = uid
    AND b.category_id = parent.id
    AND EXISTS (SELECT 1 FROM public.categories c2 WHERE c2.parent_id = parent.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.budgets b2
      WHERE b2.user_id = uid
        AND b2.category_id = child.id
        AND b2.month_year = b.month_year
    );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_defaults() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_defaults() TO authenticated;
