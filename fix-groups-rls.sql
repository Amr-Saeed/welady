-- ========================================
-- Fix RLS recursion for groups and related tables
-- ========================================
-- Error seen: 42P17 infinite recursion detected in policy for relation "groups"
--
-- This script replaces the recursive group policies with SECURITY DEFINER
-- helper functions that can safely inspect groups and group_members without
-- re-entering RLS.

-- 1) Helper: teacher owns this group
CREATE OR REPLACE FUNCTION public.can_teacher_access_group(p_group_id UUID, p_teacher_id UUID DEFAULT auth.uid())
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

-- 2) Helper: parent has a child in this group
CREATE OR REPLACE FUNCTION public.can_parent_access_group(p_group_id UUID, p_parent_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.children c ON c.id = gm."childID"
    WHERE gm."groupID" = p_group_id
      AND c."parentID" = p_parent_id
  );
$$;

-- 3) Drop existing policies on groups
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'groups'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.groups', p.policyname);
  END LOOP;
END $$;

-- 4) Recreate groups policies without recursion
CREATE POLICY "Teachers can create their own groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "teacherID");

CREATE POLICY "Teachers can view their own groups"
ON public.groups
FOR SELECT
TO authenticated
USING (auth.uid() = "teacherID");

CREATE POLICY "Teachers can update their own groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (auth.uid() = "teacherID")
WITH CHECK (auth.uid() = "teacherID");

CREATE POLICY "Teachers can delete their own groups"
ON public.groups
FOR DELETE
TO authenticated
USING (auth.uid() = "teacherID");

CREATE POLICY "Parents can view groups their children are in"
ON public.groups
FOR SELECT
TO authenticated
USING (can_parent_access_group(id, auth.uid()));

-- 5) Drop and recreate group_members policies
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_members', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Teachers can view members of their groups"
ON public.group_members
FOR SELECT
TO authenticated
USING (can_teacher_access_group("groupID", auth.uid()));

CREATE POLICY "Teachers can add members to their groups"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (can_teacher_access_group("groupID", auth.uid()));

CREATE POLICY "Teachers can remove members from their groups"
ON public.group_members
FOR DELETE
TO authenticated
USING (can_teacher_access_group("groupID", auth.uid()));

-- 6) Homework policies for the current schema
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homework'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.homework', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Teachers can manage homework in their groups"
ON public.homework
FOR ALL
TO authenticated
USING ("groupID" IS NOT NULL AND can_teacher_access_group("groupID", auth.uid()))
WITH CHECK ("groupID" IS NOT NULL AND can_teacher_access_group("groupID", auth.uid()));

-- 7) Attendance policies for the current schema
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

CREATE POLICY "Teachers can manage attendance in their groups"
ON public.attendance
FOR ALL
TO authenticated
USING ("groupID" IS NOT NULL AND can_teacher_access_group("groupID", auth.uid()))
WITH CHECK ("groupID" IS NOT NULL AND can_teacher_access_group("groupID", auth.uid()));

-- ========================================
-- Apply this in Supabase SQL Editor.
-- After running it, teacher dashboard group queries should stop
-- hitting the recursive groups policy.
-- ========================================
