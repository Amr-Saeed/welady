-- Enrollment removals history table + RLS
-- Run this in Supabase SQL editor

create table if not exists public.enrollment_removals (
    id uuid primary key default gen_random_uuid(),
    "childID" uuid not null references public.children(id) on delete cascade,
    "parentID" uuid not null references public.users(id) on delete cascade,
    "teacherID" uuid not null references public.users(id) on delete cascade,
    "teacherName" text not null,
    "removalType" text not null check ("removalType" in ('group', 'private_lesson')),
    "groupID" uuid null,
    "privateLessonID" uuid null,
    reason text not null check (length(btrim(reason)) > 0),
    metadata jsonb not null default '{}'::jsonb,
    "removedAt" timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint enrollment_removals_target_check check (
        ("removalType" = 'group' and "groupID" is not null and "privateLessonID" is null)
        or
        ("removalType" = 'private_lesson' and "privateLessonID" is not null and "groupID" is null)
    )
);

-- If the table was created earlier with lower-case folded column names,
-- rename them to match the app payload keys.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'enrollment_removals'
          and column_name = 'childid'
    ) then
        execute 'alter table public.enrollment_removals rename column childid to "childID"';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'enrollment_removals'
          and column_name = 'parentid'
    ) then
        execute 'alter table public.enrollment_removals rename column parentid to "parentID"';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'enrollment_removals'
          and column_name = 'teacherid'
    ) then
        execute 'alter table public.enrollment_removals rename column teacherid to "teacherID"';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'enrollment_removals'
          and column_name = 'teachername'
    ) then
        execute 'alter table public.enrollment_removals rename column teachername to "teacherName"';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'enrollment_removals'
          and column_name = 'removaltype'
    ) then
        execute 'alter table public.enrollment_removals rename column removaltype to "removalType"';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'enrollment_removals'
          and column_name = 'groupid'
    ) then
        execute 'alter table public.enrollment_removals rename column groupid to "groupID"';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'enrollment_removals'
          and column_name = 'privatelessonid'
    ) then
        execute 'alter table public.enrollment_removals rename column privatelessonid to "privateLessonID"';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'enrollment_removals'
          and column_name = 'removedat'
    ) then
        execute 'alter table public.enrollment_removals rename column removedat to "removedAt"';
    end if;
end $$;

-- Drop FK constraints to deletable targets (groups/private lessons) so
-- history stays valid forever even after enrollment rows are removed.
alter table public.enrollment_removals
    drop constraint if exists "enrollment_removals_groupID_fkey",
    drop constraint if exists "enrollment_removals_privateLessonID_fkey";

-- Ensure target check exists with the intended logic.
alter table public.enrollment_removals
    drop constraint if exists enrollment_removals_target_check;

alter table public.enrollment_removals
    add constraint enrollment_removals_target_check check (
        ("removalType" = 'group' and "groupID" is not null and "privateLessonID" is null)
        or
        ("removalType" = 'private_lesson' and "privateLessonID" is not null and "groupID" is null)
    );

create index if not exists enrollment_removals_child_idx on public.enrollment_removals("childID");
create index if not exists enrollment_removals_parent_idx on public.enrollment_removals("parentID");
create index if not exists enrollment_removals_teacher_idx on public.enrollment_removals("teacherID");
create index if not exists enrollment_removals_removed_at_idx on public.enrollment_removals("removedAt" desc);

alter table public.enrollment_removals enable row level security;

-- Parents can read their own children removal history.
drop policy if exists "Parents can read own children removals" on public.enrollment_removals;
create policy "Parents can read own children removals"
on public.enrollment_removals
for select
using (
    "parentID" = auth.uid()
    and exists (
        select 1
        from public.children c
        where c.id = enrollment_removals."childID"
          and c."parentID" = auth.uid()
    )
);

-- Teachers can insert removal logs for their own account only.
drop policy if exists "Teachers can insert own removals" on public.enrollment_removals;
create policy "Teachers can insert own removals"
on public.enrollment_removals
for insert
with check (
    "teacherID" = auth.uid()
    and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'teacher'
    )
);

-- Teachers can read what they created (optional but useful for debugging).
drop policy if exists "Teachers can read own removals" on public.enrollment_removals;
create policy "Teachers can read own removals"
on public.enrollment_removals
for select
using ("teacherID" = auth.uid());
