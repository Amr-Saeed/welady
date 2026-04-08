-- ========================================
-- Fix RLS for homework_submissions
-- Solves: 42501 new row violates row-level security policy
-- ========================================

-- 1) Enable RLS
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- 2) Helper: teacher can manage a homework submission if the homework belongs
--    to one of teacher's groups or private lessons.
CREATE OR REPLACE FUNCTION public.can_teacher_manage_homework_submission(
  p_homework_id UUID,
  p_teacher_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.homework h
    LEFT JOIN public.groups g
      ON g.id = h."groupID"
    LEFT JOIN public.private_lessons pl
      ON pl.id = h."privateLessonID"
    WHERE h.id = p_homework_id
      AND (
        g."teacherID" = p_teacher_id
        OR pl."teacherID" = p_teacher_id
      )
  );
$$;

-- 3) Helper: parent/child can view own submission
CREATE OR REPLACE FUNCTION public.can_parent_or_child_view_submission(
  p_child_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = p_child_id
      AND (
        c."parentID" = p_user_id
        OR c.id = p_user_id
      )
  );
$$;

-- 4) Remove old policies on homework_submissions
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homework_submissions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.homework_submissions', p.policyname);
  END LOOP;
END $$;

-- 5) Teachers can view submissions for their homework
CREATE POLICY "Teachers can view homework submissions"
ON public.homework_submissions
FOR SELECT
TO authenticated
USING (
  public.can_teacher_manage_homework_submission(homeworkid, auth.uid())
);

-- 6) Teachers can insert submissions for their homework
CREATE POLICY "Teachers can insert homework submissions"
ON public.homework_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_teacher_manage_homework_submission(homeworkid, auth.uid())
);

-- 7) Teachers can update submissions for their homework
CREATE POLICY "Teachers can update homework submissions"
ON public.homework_submissions
FOR UPDATE
TO authenticated
USING (
  public.can_teacher_manage_homework_submission(homeworkid, auth.uid())
)
WITH CHECK (
  public.can_teacher_manage_homework_submission(homeworkid, auth.uid())
);

-- 8) Optional: teachers can delete submissions for their homework
CREATE POLICY "Teachers can delete homework submissions"
ON public.homework_submissions
FOR DELETE
TO authenticated
USING (
  public.can_teacher_manage_homework_submission(homeworkid, auth.uid())
);

-- 9) Parents/children can view their own submissions only
CREATE POLICY "Parents and children can view own homework submissions"
ON public.homework_submissions
FOR SELECT
TO authenticated
USING (
  public.can_parent_or_child_view_submission(childid, auth.uid())
);

-- ========================================
-- Verification
-- ========================================
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE schemaname='public' AND tablename='homework_submissions';
