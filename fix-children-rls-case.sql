-- ========================================
-- Fix RLS Column Reference Case Issue
-- ========================================
-- This fixes the issue where RLS policies use unquoted identifiers
-- that get folded to lowercase, causing column not found errors

-- Update the private lesson child access function with quoted identifiers
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
        WHERE pl."teacherID" = teacher_id
        AND pl."childID" = child_id
    );
END;
$$;

-- Update the group child access function with quoted identifiers
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
        INNER JOIN group_members gm ON gm."groupID" = g.id
        WHERE g."teacherID" = teacher_id
        AND gm."childID" = child_id
    );
END;
$$;

-- Create a security definer function to search for children by studentCode
-- This allows teachers to find students by code without full table access
DROP FUNCTION IF EXISTS search_child_by_code(TEXT);

CREATE OR REPLACE FUNCTION search_child_by_code(p_student_code TEXT)
RETURNS TABLE(
    id UUID,
    "parentID" UUID,
    name TEXT,
    grade TEXT,
    "studentCode" TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c."parentID",
        c.name,
        c.grade,
        c."studentCode"
    FROM children c
    WHERE c."studentCode" = UPPER(p_student_code)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a security definer function to get parent info by their IDs
-- This allows retrieving parent phone numbers and names for display
DROP FUNCTION IF EXISTS get_parent_info(UUID[]);

CREATE OR REPLACE FUNCTION get_parent_info(p_parent_ids UUID[])
RETURNS TABLE(
    id UUID,
    name TEXT,
    "phoneNumber" TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u."phoneNumber"
    FROM users u
    WHERE u.id = ANY(p_parent_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old children policies that may have the case issue
DROP POLICY IF EXISTS "Teachers can view group children" ON children;
DROP POLICY IF EXISTS "Teachers can view private lesson children" ON children;
DROP POLICY IF EXISTS "Teachers can search for children by studentCode" ON children;

-- Recreate the children policies
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
-- Usage Instructions
-- ========================================
-- Instead of: SELECT * FROM children WHERE "studentCode" = 'CODE'
-- Use this function: SELECT * FROM search_child_by_code('CODE')
-- This bypasses RLS and allows teachers to find students by code
