-- ========================================
-- Fix RLS Infinite Recursion Issue
-- ========================================
-- This script creates Security Definer functions to prevent
-- infinite recursion in teacher SELECT policies on children table

-- Step 1: Create helper function for group children access
-- This function checks if a teacher can access a child through groups
CREATE OR REPLACE FUNCTION is_teacher_group_child(teacher_id UUID, child_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM groups g
        INNER JOIN group_members gm ON gm.groupID = g.id
        WHERE g.teacherID = teacher_id
        AND gm.childID = child_id
    );
END;
$$;

-- Step 2: Create helper function for private lesson children access
-- This function checks if a teacher can access a child through private lessons
CREATE OR REPLACE FUNCTION is_teacher_private_lesson_child(teacher_id UUID, child_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM private_lessons pl
        WHERE pl.teacherID = teacher_id
        AND pl.childID = child_id
    );
END;
$$;

-- Step 3: Drop existing teacher SELECT policies (we'll recreate them)
DROP POLICY IF EXISTS "Teachers can view group children" ON children;
DROP POLICY IF EXISTS "Teachers can view private lesson children" ON children;

-- Step 4: Create NEW teacher SELECT policies using Security Definer functions
-- These policies use the helper functions above, avoiding infinite recursion

-- Policy for group children
CREATE POLICY "Teachers can view group children"
ON children
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM teachers t
        WHERE t.id = auth.uid()
        AND is_teacher_group_child(t.id, children.id)
    )
);

-- Policy for private lesson children
CREATE POLICY "Teachers can view private lesson children"
ON children
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM teachers t
        WHERE t.id = auth.uid()
        AND is_teacher_private_lesson_child(t.id, children.id)
    )
);

-- ========================================
-- DONE! Now test your queries
-- ========================================
-- Try running: SELECT * FROM children WHERE parentID = 'your-parent-id'
-- Should work without recursion errors
