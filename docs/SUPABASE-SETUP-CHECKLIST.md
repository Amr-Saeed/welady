# ✅ SUPABASE SETUP CHECKLIST

Follow these steps to complete the Supabase setup for teacher features.

---

## 📋 Pre-Setup Verification

- [ ] You have Supabase project created
- [ ] You have database already set up (parents table exists)
- [ ] You can access Supabase SQL Editor
- [ ] You've backed up existing data (optional but recommended)

---

## 🔧 STEP 1: Run Database Migration

### Action:

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire content from: `docs/teacher-schema.sql`
4. Paste into SQL Editor
5. Click "Run" button

### Verify:

```sql
-- Run each to confirm tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Should include: groups, group_members, group_schedule, group_homework, group_attendance
```

Expected tables:

- [ ] `groups` table created
- [ ] `group_members` table created
- [ ] `group_schedule` table created
- [ ] `group_homework` table created
- [ ] `group_attendance` table created

### Troubleshooting:

If you get errors:

1. Check that `children` table exists (parent feature prerequisite)
2. Check that `parents` table exists
3. Verify column names match exactly (case-sensitive)
4. Try running each CREATE TABLE separately to find which one fails

---

## 🔐 STEP 2: Verify RLS Policies

### Action:

Check that RLS was enabled on new tables.

### Verify:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('groups', 'group_members', 'group_schedule', 'group_homework', 'group_attendance');

-- Should show 't' (true) for all rows
```

Expected output:

- [ ] `groups` → RLS enabled (true)
- [ ] `group_members` → RLS enabled (true)
- [ ] `group_schedule` → RLS enabled (true)
- [ ] `group_homework` → RLS enabled (true)
- [ ] `group_attendance` → RLS enabled (true)

### Troubleshooting:

If RLS is NOT enabled, run:

```sql
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_attendance ENABLE ROW LEVEL SECURITY;
```

---

## 👥 STEP 3: Verify Teachers Table

### Action:

Ensure `teachers` table exists with correct schema.

### Verify:

```sql
-- Check teachers table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teachers';

-- Should show: id, specialization, totalGroups, totalStudents, subscriptionStatus, subscriptionTier, created_at
```

Expected columns:

- [ ] `id` (UUID, primary key)
- [ ] `specialization` (TEXT)
- [ ] `totalGroups` (INT)
- [ ] `totalStudents` (INT)
- [ ] `subscriptionStatus` (TEXT)
- [ ] `subscriptionTier` (TEXT)
- [ ] `created_at` (TIMESTAMP)

### If missing:

```sql
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    specialization TEXT,
    totalGroups INT DEFAULT 0,
    totalStudents INT DEFAULT 0,
    subscriptionStatus TEXT DEFAULT 'trial',
    subscriptionTier TEXT DEFAULT 'tier_1',
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🏷️ STEP 4: Verify Users Table Has Role Column

### Action:

Check that `users` table has `role` column to distinguish teachers from parents.

### Verify:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'role';
```

Should return one row with `role`.

### If missing:

```sql
ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'parent' CHECK (role IN ('parent', 'teacher'));

-- Update existing users to role='parent'
UPDATE public.users SET role = 'parent' WHERE role IS NULL;
```

### Expected:

- [ ] `users.role` column exists
- [ ] Default value is 'parent'
- [ ] Check constraint allows only 'parent' or 'teacher'

---

## 🔑 STEP 5: Verify Indexes

### Action:

Confirm performance indexes were created.

### Verify:

```sql
-- Check indexes on groups table
SELECT indexname FROM pg_indexes WHERE tablename = 'groups';

-- Should include: idx_groups_teacher_id, idx_groups_group_code
```

Expected indexes:

- [ ] `idx_groups_teacher_id`
- [ ] `idx_groups_group_code`
- [ ] `idx_group_members_*`
- [ ] `idx_group_schedule_*`
- [ ] `idx_group_homework_*`
- [ ] `idx_group_attendance_*`

### Troubleshooting:

If indexes missing, they'll be created by migration, but you can manually add:

```sql
CREATE INDEX idx_groups_teacher_id ON public.groups(teacher_id);
CREATE INDEX idx_groups_group_code ON public.groups(group_code);
-- ... other indexes from teacher-schema.sql
```

---

## 🔑 STEP 6: Verify Helper Function

### Action:

Check that group code generation function exists.

### Verify:

```sql
-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'generate_group_code';
```

Should return: `generate_group_code`

### Test:

```sql
-- Test generating a code
SELECT public.generate_group_code();

-- Should return something like: GRP-ABC123XYZ
```

Expected:

- [ ] `generate_group_code()` function exists
- [ ] Generates codes starting with "GRP-"
- [ ] 9 random alphanumeric characters after prefix
- [ ] Codes are unique

---

## 🔐 STEP 7: Test RLS Policies

### Action:

Verify RLS policies are working correctly.

### Setup Test Data:

```sql
-- Create test teacher user (you'll need valid auth user)
INSERT INTO public.users (id, name, phoneNumber, role)
VALUES ('test-teacher-id', 'تجربة معلم', '+2010000000', 'teacher');

-- Create test group
INSERT INTO public.groups (teacher_id, name, subject, type, group_code)
VALUES ('test-teacher-id', 'مجموعة تجربة', 'رياضيات', 'group', 'GRP-TEST');

-- Verify teacher sees own group
SELECT * FROM public.groups WHERE teacher_id = 'test-teacher-id';
-- Should return 1 row

-- Verify RLS blocks other teachers (test with different auth user)
-- (This requires logging in as different teacher)
```

Expected behavior:

- [ ] Teacher sees only own groups
- [ ] Parent cannot see teacher groups
- [ ] Unauthenticated users see no data
- [ ] No SQL errors when querying

---

## 📱 STEP 8: Start Development & Test Flows

### Action:

Run the app and test the complete teacher/parent flows.

### Commands:

```bash
cd /path/to/welady
npm install  # if not done yet
npm run dev   # start dev server
```

### Test Teacher Registration:

- [ ] Go to `http://localhost:5173`
- [ ] Click "معلم" (Teacher)
- [ ] Fill signup form:
  - Name: تجربة معلم
  - Phone: 01XXXX XXXXX
  - Specialization: رياضيات
  - Password: test1234
- [ ] Click "تسجيل جديد" (Register)
- [ ] Verify redirects to `/teacher/dashboard`

### Verify Teacher Data Saved:

```sql
-- Check user created
SELECT * FROM public.users WHERE role = 'teacher' ORDER BY created_at DESC LIMIT 1;

-- Check teacher profile created
SELECT * FROM public.teachers ORDER BY created_at DESC LIMIT 1;

-- Verify auth user exists
SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 1;
```

Expected:

- [ ] Entry in `users` table with role='teacher'
- [ ] Entry in `teachers` table with specialization
- [ ] Entry in `auth.users` with generated email

### Test Create Group:

- [ ] Dashboard → "إنشاء مجموعة جديدة"
- [ ] Fill form and submit
- [ ] Verify group appears in list with code

### Verify Group Created:

```sql
SELECT id, name, group_code FROM public.groups ORDER BY created_at DESC LIMIT 1;

-- Should show group with unique code like: GRP-ABC123XYZ
```

---

## 🧪 STEP 9: Test Parent Flow

### Action:

Test parent joins group using teacher's code.

### Setup:

- [ ] Open new incognito window (different browser or session)
- [ ] Signup as parent
- [ ] Add a child
- [ ] Go to Dashboard → "الانضمام لمجموعة"

### Test Joining:

- [ ] Enter teacher's group code (e.g., GRP-ABC123XYZ)
- [ ] Click "البحث" (Search)
- [ ] Select child
- [ ] Click "الانضمام" (Join)
- [ ] Verify success message and redirect

### Verify Data Saved:

```sql
SELECT * FROM public.group_members ORDER BY joined_at DESC LIMIT 1;

-- Should show: group_id, child_id, parent_id, joined_at
```

### Verify Parent Can See Group:

```sql
-- As parent user, should see groups they're members of
SELECT g.* FROM public.groups g
JOIN public.group_members gm ON g.id = gm.group_id
WHERE gm.parent_id = '[parent-user-id]';

-- Should return the joined group
```

---

## 🎯 STEP 10: Final Verification

### Data Integrity Checks:

```sql
-- 1. Count tables have data
SELECT 'groups' as table_name, COUNT(*) as row_count FROM public.groups
UNION ALL
SELECT 'group_members', COUNT(*) FROM public.group_members
UNION ALL
SELECT 'group_schedule', COUNT(*) FROM public.group_schedule
UNION ALL
SELECT 'group_homework', COUNT(*) FROM public.group_homework
UNION ALL
SELECT 'group_attendance', COUNT(*) FROM public.group_attendance;

-- 2. Verify referential integrity
SELECT COUNT(*) FROM public.group_members
WHERE group_id NOT IN (SELECT id FROM public.groups);
-- Should return 0 (no orphaned records)

-- 3. Check unique constraints
SELECT group_code, COUNT(*) FROM public.groups
GROUP BY group_code HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicate codes)
```

Final Checks:

- [ ] All tables have data
- [ ] No referential integrity violations
- [ ] No duplicate group codes
- [ ] RLS policies working (teachers see only own groups)
- [ ] Build succeeds: `npm run build` ✓

---

## 🚨 TROUBLESHOOTING

### Problem: "Unknown table" error when running migration

**Solution:**

1. Verify you're connected to correct Supabase project
2. Check children/parents tables exist first
3. Run tables one at a time to find the problem

### Problem: "Permission denied" when creating table

**Solution:**

1. Must use `--superuser role is required for this operation`
2. Go to Supabase → SQL Editor (not direct database connection)
3. May need to re-authenticate

### Problem: RLS policy errors during testing

**Solution:**

1. Verify `auth.uid()` matches user ID from `users` table
2. Check the policy logic:
   ```sql
   -- This should match current user
   WHERE teacher_id = auth.uid()
   ```

### Problem: Group code is NULL when creating group

**Solution:**

1. Verify `generate_group_code()` function exists
2. Try running: `SELECT generate_group_code();`
3. Check that groups table was created with gen_random_uuid()

### Problem: Parent can't join group with code

**Solution:**

1. Verify group_code is exactly correct (case-sensitive)
2. Check group exists: `SELECT * FROM groups WHERE group_code = 'GRP-XXX';`
3. Ensure parent has children (required for joining)

### Problem: Can't see groups in teacher dashboard

**Solution:**

1. Check auth session: Open browser console → check localStorage
2. Verify user ID matches in `users.id` and JWT token
3. Test RLS policy directly:
   ```sql
   SELECT * FROM groups
   WHERE teacher_id = 'YOUR-USER-ID';
   ```

---

## 📞 SUPPORT RESOURCES

1. **SQL Editor**: Supabase Dashboard → SQL Editor
2. **Table Editor**: Supabase Dashboard → Database → Tables
3. **Auth Users**: Supabase Dashboard → Authentication
4. **Logs**: Supabase Dashboard → Logs
5. **Docs**: `docs/teacher-schema.sql` (comments in file)
6. **Implementation Guide**: `docs/TEACHER-IMPLEMENTATION.md`
7. **User Flows**: `docs/USER-FLOWS.md`

---

## ✅ COMPLETION CHECKLIST

When all steps are complete, mark these:

- [ ] All 5 tables created
- [ ] RLS enabled on all tables
- [ ] Teachers table verified
- [ ] Users table has role column
- [ ] Indexes created
- [ ] Helper function exists
- [ ] RLS policies tested
- [ ] Teacher signup/login works
- [ ] Teacher can create groups
- [ ] Parent can join groups
- [ ] Build succeeds without errors
- [ ] No console JavaScript errors
- [ ] All user flows working

---

**Status**: Ready for Production ✅
**Date**: April 4, 2026
**Next Steps**: User testing → Deploy to production
