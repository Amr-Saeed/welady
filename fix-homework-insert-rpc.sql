-- ========================================
-- Safe insert RPC for parent homework
-- ========================================
-- Solves: 42P17 infinite recursion in groups policies when inserting homework.

CREATE OR REPLACE FUNCTION public.add_parent_homework(
  p_child_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_due_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_homework_id UUID;
BEGIN
  -- Ensure the authenticated user owns this child
  IF NOT EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = p_child_id
      AND c."parentID" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not allowed to add homework for this child';
  END IF;

  INSERT INTO public.homework (
    "groupID",
    "childID",
    "privateLessonID",
    title,
    description,
    "dueDate"
  )
  VALUES (
    NULL,
    p_child_id,
    NULL,
    p_title,
    p_description,
    p_due_date
  )
  RETURNING id INTO v_homework_id;

  RETURN v_homework_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_parent_homework(UUID, TEXT, TEXT, DATE) TO authenticated;

-- ========================================
-- Safe read RPC for parent homeworks
-- ========================================

CREATE OR REPLACE FUNCTION public.get_parent_homeworks(p_child_id UUID)
RETURNS TABLE (
  id UUID,
  "childID" UUID,
  title TEXT,
  description TEXT,
  "dueDate" DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    h."childID",
    h.title,
    h.description,
    h."dueDate",
    h.created_at
  FROM public.homework h
  JOIN public.children c ON c.id = h."childID"
  WHERE h."childID" = p_child_id
    AND c."parentID" = auth.uid()
  ORDER BY h."dueDate" ASC, h.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_homeworks(UUID) TO authenticated;
