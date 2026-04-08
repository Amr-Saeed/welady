# Fix for Student Search RLS Error

## Problem

When teachers try to search for students by code to add them to a group, they get an error:

```
Error: column pl.teacherid does not exist
```

## Root Cause

1. RLS policies use unquoted identifiers (`pl.teacherID`) that get folded to lowercase (`pl.teacherid`)
2. The actual database columns are camelCase (`teacherID`, `childID`) which don't match
3. Teachers need a way to search for students by code without existing group membership

## Solution

1. **Run the SQL fix** to update RLS policies with proper quoted identifiers
2. **Create a secure database function** that allows teachers to search by studentCode
3. **Use the new function** in the application to avoid RLS conflicts

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project (Weladi)
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Run the Fix SQL

Copy and paste the contents of `fix-children-rls-case.sql` into the SQL Editor and click "Run"

The fix will:

- Update RLS helper functions with proper column quoting
- Create a new `search_child_by_code()` function with SECURITY DEFINER
- Recreate the children RLS policies with correct syntax

### Step 3: Verify the Fix

In Supabase SQL Editor, test:

```sql
SELECT * FROM search_child_by_code('WAL-8846');
```

You should see the student record returned without errors.

### Step 4: Test in the App

1. Go to a group's Members tab
2. Click "إضافة طالب"
3. Enter a valid student code
4. The search should work now!

## What Changed in the Code

### Before (Direct SELECT - conflicts with RLS):

```javascript
const { data, error } = await supabase
  .from("children")
  .select("id, name, grade, studentCode, parentID")
  .eq("studentCode", studentCode.toUpperCase())
  .single();
```

### After (Using Secure Function - bypasses RLS):

```javascript
const { data, error } = await supabase.rpc("search_child_by_code", {
  p_student_code: studentCode.toUpperCase(),
});
```

The `.rpc()` method calls the `search_child_by_code()` function in the database, which has `SECURITY DEFINER` privileges to bypass RLS restrictions.

## Security Notes

- The `search_child_by_code()` function is designed for authenticated teachers only
- It only returns results for matching studentCode (case-insensitive)
- Teachers can add any student by code, which is standard for group enrollment
- Once added, the student appears in the group and parents can view it
