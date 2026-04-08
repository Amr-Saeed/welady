-- ========================================
-- Safe RPCs for lesson expenses (parent scope)
-- Robust table-name detection: lessonexpenses | lesson_expenses | lesson-expenses | lessonExpenses
-- ========================================

CREATE OR REPLACE FUNCTION public._get_lesson_expenses_table_name()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
BEGIN
  IF to_regclass('public.lessonexpenses') IS NOT NULL THEN
    v_table := 'lessonexpenses';
  ELSIF to_regclass('public.lesson_expenses') IS NOT NULL THEN
    v_table := 'lesson_expenses';
  ELSIF to_regclass('public."lesson-expenses"') IS NOT NULL THEN
    v_table := 'lesson-expenses';
  ELSIF to_regclass('public."lessonExpenses"') IS NOT NULL THEN
    v_table := 'lessonExpenses';
  ELSE
    RAISE EXCEPTION 'Could not find lesson expenses table in public schema';
  END IF;

  RETURN v_table;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_parent_lesson_expenses(p_child_id UUID)
RETURNS TABLE (
  id UUID,
  "childID" UUID,
  "groupID" UUID,
  "privateLessonID" UUID,
  "manualLessonID" UUID,
  month DATE,
  amount NUMERIC,
  status TEXT,
  "paymentDate" TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
  v_sql TEXT;
BEGIN
  v_table := public._get_lesson_expenses_table_name();

  v_sql := format(
    'SELECT le.id, le."childID", le."groupID", le."privateLessonID", le."manualLessonID", le.month, le.amount, le.status, le."paymentDate", le.created_at
     FROM public.%I le
     JOIN public.children c ON c.id = le."childID"
     WHERE le."childID" = $1
       AND c."parentID" = auth.uid()
     ORDER BY le.created_at DESC',
    v_table
  );

  RETURN QUERY EXECUTE v_sql USING p_child_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_lesson_expenses(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_parent_lesson_expense(
  p_amount NUMERIC,
  p_child_id UUID,
  p_month DATE,
  p_payment_date TIMESTAMPTZ,
  p_status TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_table TEXT;
  v_sql TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = p_child_id
      AND c."parentID" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not allowed to add expenses for this child';
  END IF;

  v_table := public._get_lesson_expenses_table_name();

  v_sql := format(
    'INSERT INTO public.%I ("childID", "groupID", "privateLessonID", "manualLessonID", month, amount, status, "paymentDate")
     VALUES ($1, NULL, NULL, NULL, $2, $3, $4, $5)
     RETURNING id',
    v_table
  );

  EXECUTE v_sql
  INTO v_id
  USING p_child_id, p_month, p_amount, p_status, p_payment_date;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_parent_lesson_expense(NUMERIC, UUID, DATE, TIMESTAMPTZ, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_parent_lesson_expense_paid(
  p_child_id UUID,
  p_expense_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
  v_sql TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = p_child_id
      AND c."parentID" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not allowed to update expenses for this child';
  END IF;

  v_table := public._get_lesson_expenses_table_name();

  v_sql := format(
    'UPDATE public.%I le
     SET status = ''paid'', "paymentDate" = now()
     WHERE le.id = $1
       AND le."childID" = $2',
    v_table
  );

  EXECUTE v_sql USING p_expense_id, p_child_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_parent_lesson_expense_paid(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_parent_lesson_expense(
  p_child_id UUID,
  p_expense_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
  v_sql TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = p_child_id
      AND c."parentID" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not allowed to delete expenses for this child';
  END IF;

  v_table := public._get_lesson_expenses_table_name();

  v_sql := format(
    'DELETE FROM public.%I le
     WHERE le.id = $1
       AND le."childID" = $2',
    v_table
  );

  EXECUTE v_sql USING p_expense_id, p_child_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_parent_lesson_expense(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_parent_lesson_expense_status(
  p_child_id UUID,
  p_expense_id UUID,
  p_status TEXT,
  p_payment_date TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
  v_sql TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = p_child_id
      AND c."parentID" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not allowed to update expenses for this child';
  END IF;

  v_table := public._get_lesson_expenses_table_name();

  v_sql := format(
    'UPDATE public.%I le
     SET status = $3,
         "paymentDate" = $4
     WHERE le.id = $1
       AND le."childID" = $2',
    v_table
  );

  EXECUTE v_sql USING p_expense_id, p_child_id, p_status, p_payment_date;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_lesson_expense_status(UUID, UUID, TEXT, TIMESTAMPTZ) TO authenticated;
