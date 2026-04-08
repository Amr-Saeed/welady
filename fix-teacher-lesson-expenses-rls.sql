-- Teacher access policies for lesson_expenses
-- Run in Supabase SQL editor if teacher payment updates return 403/RLS errors.

alter table public.lesson_expenses enable row level security;

drop policy if exists "Teachers can view own group/private lesson expenses" on public.lesson_expenses;
create policy "Teachers can view own group/private lesson expenses"
on public.lesson_expenses
for select
using (
  (
    "groupID" is not null
    and exists (
      select 1
      from public.groups g
      where g.id = lesson_expenses."groupID"
        and g."teacherID" = auth.uid()
    )
  )
  or
  (
    "privateLessonID" is not null
    and exists (
      select 1
      from public.private_lessons pl
      where pl.id = lesson_expenses."privateLessonID"
        and pl."teacherID" = auth.uid()
    )
  )
);

drop policy if exists "Teachers can insert own group/private lesson expenses" on public.lesson_expenses;
create policy "Teachers can insert own group/private lesson expenses"
on public.lesson_expenses
for insert
with check (
  (
    "groupID" is not null
    and exists (
      select 1
      from public.groups g
      where g.id = lesson_expenses."groupID"
        and g."teacherID" = auth.uid()
    )
  )
  or
  (
    "privateLessonID" is not null
    and exists (
      select 1
      from public.private_lessons pl
      where pl.id = lesson_expenses."privateLessonID"
        and pl."teacherID" = auth.uid()
    )
  )
);

drop policy if exists "Teachers can update own group/private lesson expenses" on public.lesson_expenses;
create policy "Teachers can update own group/private lesson expenses"
on public.lesson_expenses
for update
using (
  (
    "groupID" is not null
    and exists (
      select 1
      from public.groups g
      where g.id = lesson_expenses."groupID"
        and g."teacherID" = auth.uid()
    )
  )
  or
  (
    "privateLessonID" is not null
    and exists (
      select 1
      from public.private_lessons pl
      where pl.id = lesson_expenses."privateLessonID"
        and pl."teacherID" = auth.uid()
    )
  )
)
with check (
  (
    "groupID" is not null
    and exists (
      select 1
      from public.groups g
      where g.id = lesson_expenses."groupID"
        and g."teacherID" = auth.uid()
    )
  )
  or
  (
    "privateLessonID" is not null
    and exists (
      select 1
      from public.private_lessons pl
      where pl.id = lesson_expenses."privateLessonID"
        and pl."teacherID" = auth.uid()
    )
  )
);
