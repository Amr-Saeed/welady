-- ========================================
-- Fix RLS policies for public.teachers
-- ========================================
-- Solves: 42501 new row violates row-level security policy for table "teachers"

-- Ensure RLS is enabled
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teachers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.teachers', p.policyname);
  END LOOP;
END $$;

-- Teachers can insert their own profile row only
CREATE POLICY "Teachers can insert own profile"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Teachers can view their own profile
CREATE POLICY "Teachers can select own profile"
ON public.teachers
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Teachers can update their own profile
CREATE POLICY "Teachers can update own profile"
ON public.teachers
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Optional: teachers can delete their own profile
CREATE POLICY "Teachers can delete own profile"
ON public.teachers
FOR DELETE
TO authenticated
USING (id = auth.uid());

-- ========================================
-- Verify after running:
-- select policyname, cmd from pg_policies where schemaname='public' and tablename='teachers';
-- ========================================
