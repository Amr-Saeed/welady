-- ============================================================================
-- TEACHER FEATURES SCHEMA
-- ============================================================================
-- Tables: groups, group_members, group_schedule, group_homework, group_attendance
-- ============================================================================

-- 1. Groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('group', 'private')), -- 'group' or 'private'
    description TEXT,
    group_code TEXT NOT NULL UNIQUE, -- e.g., "GRP-ABC123XYZ"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT groups_name_per_teacher UNIQUE(teacher_id, name)
);

CREATE INDEX idx_groups_teacher_id ON public.groups(teacher_id);
CREATE INDEX idx_groups_group_code ON public.groups(group_code);

-- 2. Group Members (children in group)
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT group_member_unique UNIQUE(group_id, child_id)
);

CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_child_id ON public.group_members(child_id);
CREATE INDEX idx_group_members_parent_id ON public.group_members(parent_id);

-- 3. Group Schedule (lesson times)
CREATE TABLE IF NOT EXISTS public.group_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT schedule_valid_times CHECK (start_time < end_time)
);

CREATE INDEX idx_group_schedule_group_id ON public.group_schedule(group_id);

-- 4. Group Homework
CREATE TABLE IF NOT EXISTS public.group_homework (
    id UUID PRIMARY key DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    child_id UUID, -- NULL means for whole group, NOT NULL means for specific child
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT homework_scope CHECK (
        (group_id IS NOT NULL) OR (child_id IS NOT NULL)
    )
);

CREATE INDEX idx_group_homework_group_id ON public.group_homework(group_id);
CREATE INDEX idx_group_homework_child_id ON public.group_homework(child_id);
CREATE INDEX idx_group_homework_due_date ON public.group_homework(due_date);

-- 5. Group Attendance
CREATE TABLE IF NOT EXISTS public.group_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    lesson_date TIMESTAMP NOT NULL, -- Date of the lesson
    status TEXT NOT NULL CHECK (status IN ('attending', 'absent', 'late', 'canceled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT attendance_unique UNIQUE(group_id, child_id, lesson_date)
);

CREATE INDEX idx_group_attendance_group_id ON public.group_attendance(group_id);
CREATE INDEX idx_group_attendance_child_id ON public.group_attendance(child_id);
CREATE INDEX idx_group_attendance_lesson_date ON public.group_attendance(lesson_date);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_attendance ENABLE ROW LEVEL SECURITY;

-- Groups RLS
CREATE POLICY "Teachers can create their own groups"
    ON public.groups
    FOR INSERT
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their own groups"
    ON public.groups
    FOR SELECT
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own groups"
    ON public.groups
    FOR UPDATE
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own groups"
    ON public.groups
    FOR DELETE
    USING (auth.uid() = teacher_id);

-- Parents can view groups their children are in
CREATE POLICY "Parents can view groups their children are in"
    ON public.groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = id
            AND gm.parent_id = auth.uid()
        )
    );

-- Group Members RLS
CREATE POLICY "Teachers can view members of their groups"
    ON public.group_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can add members to their groups"
    ON public.group_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can remove members from their groups"
    ON public.group_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view their children in group members"
    ON public.group_members
    FOR SELECT
    USING (parent_id = auth.uid());

-- Group Schedule RLS
CREATE POLICY "Teachers can manage schedule for their groups"
    ON public.group_schedule
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view schedule of groups their children are in"
    ON public.group_schedule
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = group_id
            AND gm.parent_id = auth.uid()
        )
    );

-- Group Homework RLS
CREATE POLICY "Teachers can manage homework in their groups"
    ON public.group_homework
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view homework for their children"
    ON public.group_homework
    FOR SELECT
    USING (
        child_id = (
            SELECT id FROM public.children WHERE id = child_id AND parent_id = auth.uid()
        )
        OR group_id IN (
            SELECT group_id FROM public.group_members WHERE parent_id = auth.uid()
        )
    );

-- Group Attendance RLS
CREATE POLICY "Teachers can manage attendance in their groups"
    ON public.group_attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND g.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view attendance for their children"
    ON public.group_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = group_id
            AND gm.child_id = child_id
            AND gm.parent_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTION: Generate unique group code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_group_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code TEXT := 'GRP-';
    i INT;
BEGIN
    FOR i IN 1..9 LOOP
        code := code || substr(chars, (FLOOR(RANDOM() * 36)::INT + 1), 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Group codes are auto-generated as "GRP-" + 9 random alphanumeric chars
-- 2. Schedule uses day_of_week (0-6) and time fields for flexibility
-- 3. Homework can be for whole group (child_id = NULL) or specific child
-- 4. Attendance supports: attending, absent, late, canceled statuses
-- 5. All modifications are tracked via created_at/updated_at/created_by
