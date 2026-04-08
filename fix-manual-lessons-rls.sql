-- ========================================
-- Fix RLS recursion for manual_lessons
-- ========================================
-- Error seen: 42P17 infinite recursion detected in policy for relation "groups"
-- This script replaces manual_lessons policies with safe function-based checks.

-- 1) Helper: parent owns child
CREATE OR REPLACE FUNCTION is_parent_child(user_id UUID, child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM children c
    WHERE c.id = child_id
      AND c.parentID = user_id
  );
$$;

-- 2) Keep/create teacher helpers as SECURITY DEFINER (safe from RLS recursion)
CREATE OR REPLACE FUNCTION is_teacher_group_child(teacher_id UUID, child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM groups g
    JOIN group_members gm ON gm.groupID = g.id
    WHERE g.teacherID = teacher_id
      AND gm.childID = child_id
  );
$$;

CREATE OR REPLACE FUNCTION is_teacher_private_lesson_child(teacher_id UUID, child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private_lessons pl
    WHERE pl.teacherID = teacher_id
      AND pl.childID = child_id
  );
$$;

-- 3) Drop ALL existing policies on manual_lessons (safe reset)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'manual_lessons'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.manual_lessons', p.policyname);
  END LOOP;
END $$;

-- 4) Parent policies (full CRUD for their own children)
CREATE POLICY "Parent select own manual lessons"
ON public.manual_lessons
FOR SELECT
TO authenticated
USING (is_parent_child(auth.uid(), childID));

CREATE POLICY "Parent insert own manual lessons"
ON public.manual_lessons
FOR INSERT
TO authenticated
WITH CHECK (is_parent_child(auth.uid(), childID));

CREATE POLICY "Parent update own manual lessons"
ON public.manual_lessons
FOR UPDATE
TO authenticated
USING (is_parent_child(auth.uid(), childID))
WITH CHECK (is_parent_child(auth.uid(), childID));

CREATE POLICY "Parent delete own manual lessons"
ON public.manual_lessons
FOR DELETE
TO authenticated
USING (is_parent_child(auth.uid(), childID));

-- 5) Optional teacher read access
CREATE POLICY "Teacher select related manual lessons"
ON public.manual_lessons
FOR SELECT
TO authenticated
USING (
  is_teacher_group_child(auth.uid(), childID)
  OR is_teacher_private_lesson_child(auth.uid(), childID)
);

-- ========================================
-- Run this in Supabase SQL Editor, then try adding a lesson again.
-- ========================================
