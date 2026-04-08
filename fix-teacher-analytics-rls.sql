-- Teacher analytics snapshot table + RLS
-- Run this in Supabase SQL editor

create table if not exists public.teacher_analytics_snapshots (
    id uuid primary key default gen_random_uuid(),
    teacher_id uuid not null unique references public.users(id) on delete cascade,
    summary jsonb not null default '{}'::jsonb,
    student_distribution jsonb not null default '[]'::jsonb,
    income_distribution jsonb not null default '[]'::jsonb,
    grade_distribution jsonb not null default '[]'::jsonb,
    monthly_income jsonb not null default '[]'::jsonb,
    subject_distribution jsonb not null default '[]'::jsonb,
    day_distribution jsonb not null default '[]'::jsonb,
    generated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists teacher_analytics_snapshots_teacher_idx
    on public.teacher_analytics_snapshots(teacher_id);
create index if not exists teacher_analytics_snapshots_generated_at_idx
    on public.teacher_analytics_snapshots(generated_at desc);

alter table public.teacher_analytics_snapshots enable row level security;

drop policy if exists "Teachers can read own analytics snapshot" on public.teacher_analytics_snapshots;
create policy "Teachers can read own analytics snapshot"
on public.teacher_analytics_snapshots
for select
using (teacher_id = auth.uid());

drop policy if exists "Teachers can insert own analytics snapshot" on public.teacher_analytics_snapshots;
create policy "Teachers can insert own analytics snapshot"
on public.teacher_analytics_snapshots
for insert
with check (
    teacher_id = auth.uid()
    and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'teacher'
    )
);

drop policy if exists "Teachers can update own analytics snapshot" on public.teacher_analytics_snapshots;
create policy "Teachers can update own analytics snapshot"
on public.teacher_analytics_snapshots
for update
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

-- Keep updated_at fresh on every update.
create or replace function public.set_teacher_analytics_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_teacher_analytics_updated_at on public.teacher_analytics_snapshots;
create trigger trg_teacher_analytics_updated_at
before update on public.teacher_analytics_snapshots
for each row
execute function public.set_teacher_analytics_updated_at();
