-- ========================================
-- Fix attendance table for per-lesson status tracking
-- Solves:
-- 1) 42P10 no unique or exclusion constraint matching ON CONFLICT
-- 2) RLS for teacher/parent attendance flows
-- 3) One attendance row per child per lesson date
-- ========================================

-- 1) Ensure RLS is enabled
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 2) Add unique constraint for one row per group + child + lessonDate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_group_child_lessondate_unique'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
    ADD CONSTRAINT attendance_group_child_lessondate_unique
    UNIQUE ("groupID", "childID", "lessonDate");
  END IF;
END $$;

-- 3) Helper: teacher can manage attendance for their own groups
CREATE OR REPLACE FUNCTION public.can_teacher_manage_attendance(
  p_group_id UUID,
  p_teacher_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g."teacherID" = p_teacher_id
  );
$$;

-- 4) Helper: parent or child can view/update their own attendance rows
CREATE OR REPLACE FUNCTION public.can_parent_or_child_access_attendance(
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

-- 5) Drop existing attendance policies
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance', p.policyname);
  END LOOP;
END $$;

-- 6) Teachers can view attendance for their groups
CREATE POLICY "Teachers can view attendance for their groups"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  public.can_teacher_manage_attendance("groupID", auth.uid())
);

-- 7) Teachers can insert attendance for their groups
CREATE POLICY "Teachers can insert attendance for their groups"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_teacher_manage_attendance("groupID", auth.uid())
);

-- 8) Teachers can update attendance for their groups
CREATE POLICY "Teachers can update attendance for their groups"
ON public.attendance
FOR UPDATE
TO authenticated
USING (
  public.can_teacher_manage_attendance("groupID", auth.uid())
)
WITH CHECK (
  public.can_teacher_manage_attendance("groupID", auth.uid())
);

-- 9) Teachers can delete attendance for their groups
CREATE POLICY "Teachers can delete attendance for their groups"
ON public.attendance
FOR DELETE
TO authenticated
USING (
  public.can_teacher_manage_attendance("groupID", auth.uid())
);

-- 10) Parents/children can view their own attendance rows
CREATE POLICY "Parents and children can view own attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  public.can_parent_or_child_access_attendance("childID", auth.uid())
);

-- 11) Optional: allow parents to update only their own child attendance rows
-- This supports parent-driven attendance confirmation from notifications.
CREATE POLICY "Parents and children can update own attendance"
ON public.attendance
FOR UPDATE
TO authenticated
USING (
  public.can_parent_or_child_access_attendance("childID", auth.uid())
)
WITH CHECK (
  public.can_parent_or_child_access_attendance("childID", auth.uid())
);

-- ========================================
-- Notes
-- ========================================
-- This table stores one row per child per lesson date.
-- Status values supported by the app:
--   attending, absent, late, canceled
-- The unique constraint ensures Saturday and Tuesday are separate records
-- for the same child in the same group because lessonDate differs.
