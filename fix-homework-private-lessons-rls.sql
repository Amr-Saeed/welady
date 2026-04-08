-- ========================================
-- Fix RLS for homework rows linked to private lessons
-- Solves: 42501 new row violates row-level security policy on public.homework
-- ========================================

-- 1) Ensure table has RLS enabled
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- 2) Helper: verify teacher owns the target private lesson.
--    SECURITY DEFINER avoids recursion and keeps policy checks stable.
CREATE OR REPLACE FUNCTION public.can_teacher_access_private_lesson(
  p_private_lesson_id UUID,
  p_teacher_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.private_lessons pl
    WHERE pl.id = p_private_lesson_id
      AND pl."teacherID" = p_teacher_id
      AND COALESCE(pl."isActive", true) = true
  );
$$;

-- 3) Replace only the private-lesson homework policy (leave group policy as-is).
DROP POLICY IF EXISTS "Teachers can manage homework in their private lessons" ON public.homework;

CREATE POLICY "Teachers can manage homework in their private lessons"
ON public.homework
FOR ALL
TO authenticated
USING (
  "privateLessonID" IS NOT NULL
  AND public.can_teacher_access_private_lesson("privateLessonID", auth.uid())
)
WITH CHECK (
  "privateLessonID" IS NOT NULL
  AND "groupID" IS NULL
  AND public.can_teacher_access_private_lesson("privateLessonID", auth.uid())
  AND (
    "childID" IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.private_lessons pl
      WHERE pl.id = "privateLessonID"
        AND pl."childID" = "childID"
    )
  )
);

-- Optional validation query after running this script:
-- SELECT policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname='public' AND tablename='homework'
-- ORDER BY policyname;
