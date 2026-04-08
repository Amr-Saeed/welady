-- Private lesson attendance status table + RLS
-- Run this in Supabase SQL editor

create table if not exists public.private_lesson_attendance_status (
  id uuid primary key default gen_random_uuid(),
  "privateLessonID" uuid not null references public.private_lessons(id) on delete cascade,
  "childID" uuid not null references public.children(id) on delete cascade,
  "teacherID" uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('teacher_canceled', 'child_canceled')),
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique ("privateLessonID", "childID")
);

create index if not exists pls_attendance_private_idx
  on public.private_lesson_attendance_status("privateLessonID");
create index if not exists pls_attendance_child_idx
  on public.private_lesson_attendance_status("childID");
create index if not exists pls_attendance_teacher_idx
  on public.private_lesson_attendance_status("teacherID");

alter table public.private_lesson_attendance_status enable row level security;

drop policy if exists "Teachers can read own private attendance status" on public.private_lesson_attendance_status;
create policy "Teachers can read own private attendance status"
on public.private_lesson_attendance_status
for select
using (
  exists (
    select 1
    from public.private_lessons pl
    where pl.id = private_lesson_attendance_status."privateLessonID"
      and pl."teacherID" = auth.uid()
  )
);

drop policy if exists "Teachers can insert own private attendance status" on public.private_lesson_attendance_status;
create policy "Teachers can insert own private attendance status"
on public.private_lesson_attendance_status
for insert
with check (
  "teacherID" = auth.uid()
  and exists (
    select 1
    from public.private_lessons pl
    where pl.id = private_lesson_attendance_status."privateLessonID"
      and pl."teacherID" = auth.uid()
  )
);

drop policy if exists "Teachers can update own private attendance status" on public.private_lesson_attendance_status;
create policy "Teachers can update own private attendance status"
on public.private_lesson_attendance_status
for update
using (
  exists (
    select 1
    from public.private_lessons pl
    where pl.id = private_lesson_attendance_status."privateLessonID"
      and pl."teacherID" = auth.uid()
  )
)
with check (
  "teacherID" = auth.uid()
  and exists (
    select 1
    from public.private_lessons pl
    where pl.id = private_lesson_attendance_status."privateLessonID"
      and pl."teacherID" = auth.uid()
  )
);

create or replace function public.set_private_lesson_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_private_lesson_attendance_updated_at on public.private_lesson_attendance_status;
create trigger trg_private_lesson_attendance_updated_at
before update on public.private_lesson_attendance_status
for each row
execute function public.set_private_lesson_attendance_updated_at();
