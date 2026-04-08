-- ========================================
-- Safe read RPC for parent manual lessons
-- ========================================
-- Use this to avoid RLS recursion errors during SELECT.

CREATE OR REPLACE FUNCTION public.get_parent_manual_lessons(p_child_id UUID)
RETURNS TABLE (
  id UUID,
  "childID" UUID,
  subject TEXT,
  "lessonDay" TEXT[],
  "lessonTime" TIME,
  location TEXT,
  "teacherName" TEXT,
  date DATE,
  price NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ml.id,
    ml."childID",
    ml.subject,
    ml."lessonDay",
    ml."lessonTime",
    ml.location,
    ml."teacherName",
    ml.date,
    ml.price
  FROM public.manual_lessons ml
  JOIN public.children c ON c.id = ml."childID"
  WHERE ml."childID" = p_child_id
    AND c."parentID" = auth.uid()
  ORDER BY ml.date ASC, ml."lessonTime" ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_manual_lessons(UUID) TO authenticated;
