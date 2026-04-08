# Supabase Notifications Setup

This project now has in-app notifications implemented on the client side.
To make notifications persistent and cross-device, add this backend flow in Supabase.

## 1) Create notifications table

```sql
create type public.notification_type as enum (
  'lesson_reminder',
  'homework_new',
  'homework_overdue',
  'payment_before_due',
  'payment_overdue',
  'attendance_absent',
  'attendance_late'
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  child_id uuid not null,
  type public.notification_type not null,
  title text not null,
  message text not null,
  dedupe_key text,
  meta jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  sent_at timestamptz
);

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
```

## 2) Enable RLS

```sql
alter table public.notifications enable row level security;

create policy "parents can read own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "parents can update own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

## 3) Write queue helper function

```sql
create or replace function public.queue_notification(
  p_user_id uuid,
  p_child_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_dedupe_key text default null,
  p_meta jsonb default '{}'::jsonb,
  p_scheduled_for timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    user_id,
    child_id,
    type,
    title,
    message,
    dedupe_key,
    meta,
    scheduled_for
  )
  values (
    p_user_id,
    p_child_id,
    p_type,
    p_title,
    p_message,
    p_dedupe_key,
    coalesce(p_meta, '{}'::jsonb),
    p_scheduled_for
  )
  on conflict (user_id, dedupe_key)
  where p_dedupe_key is not null
  do nothing
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.queue_notification(
  uuid, uuid, public.notification_type, text, text, text, jsonb, timestamptz
) to service_role;
```

## 4) Trigger immediate events

Use DB triggers or your API layer:

- homework_new: when homework inserted.
- attendance_absent and attendance_late: when attendance status changes.

## 5) Generate scheduled notifications (cron)

Run every 5-10 minutes using pg_cron or Supabase scheduled functions.

Generate:

- lesson_reminder: lesson starts within next 1 hour.
- homework_overdue: due date passed.
- payment_before_due: due in next 24 hours.
- payment_overdue: due date passed and unpaid.

Tip:
If your expenses table name varies, call your existing helper function that resolves the table name, then use dynamic SQL.

## 6) Deliver push/in-app

Two common options:

- In-app only: frontend polls `notifications` every 30-60s or uses realtime on inserts.
- Push notifications: an Edge Function reads unsent rows and sends via FCM/APNs, then sets `sent_at`.

## 7) Frontend integration

Replace local notification service with Supabase reads/writes:

- read: `select * from notifications where user_id = auth.uid() order by created_at desc`
- mark read: update `read_at = now()`
- event writes: call RPC or Edge Function that queues notifications.

## 8) Migration strategy

- Keep current local notifications for fallback.
- Add Supabase notifications behind a feature flag.
- Once verified, remove local storage notifications.
