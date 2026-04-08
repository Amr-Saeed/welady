# 🎓 Teacher & Parent User Flows

## 👨‍🏫 TEACHER FLOW

### 1. Registration & Login

```
Home Page
    ↓
Click "معلم" (Teacher)
    ↓
Phone Number Verification
    ↓
New User? → Sign Up Form (name, specialization, password)
Existing User? → Login Form (password)
    ↓
Teacher Dashboard
```

### 2. Create Group

```
Dashboard → "إنشاء مجموعة جديدة" (Create Group)
    ↓
Fill Form:
  - اسم المجموعة (Name)
  - المادة (Subject)
  - النوع (Type: group/private)
  - الوصفة (Description, optional)
    ↓
Click "إنشاء" (Create)
    ↓
System generates unique code: GRP-ABC123XYZ
    ↓
Group appears in Dashboard with:
  - Group name & subject
  - Type badge
  - Member count
  - Schedule count
  - Group code (shareable with parents)
```

### 3. Set Up Schedule

```
Group Card → Click to open
    ↓
Go to "الجدول" (Schedule) tab
    ↓
Click "إضافة حصة" (Add Lesson)
    ↓
Fill Form:
  - اليوم (Day: Sunday - Saturday)
  - وقت البداية (Start Time)
  - وقت النهاية (End Time)
    ↓
Click "إضافة" (Add)
    ↓
Schedule appears in list:
  "الأحد 10:00 - 11:00"
```

### 4. Invite Students

```
Share group code with parents: "GRP-ABC123XYZ"
Parents use code to join
    ↓
Parents select child to add to group
    ↓
Teacher sees members in "الطلاب" (Members) tab:
  - Student name
  - Date of birth
  - Parent name
  - Join date
```

### 5. Add Homework

```
Group Details → "الواجبات" (Homework) tab
    ↓
Click "إضافة واجب" (Add Homework)
    ↓
Fill Form:
  - عنوان الواجب (Title, required)
  - الوصفة (Description)
  - موعد التسليم (Due Date, optional)
  - طالب (Specific child, optional - leave blank for whole group)
    ↓
Click "إضافة" (Add)
    ↓
Homework shows in list:
  - Title
  - For whom (whole group or specific child)
  - Due date if set
```

### 6. Mark Attendance

```
Group Details → "الحضور" (Attendance) tab
    ↓
Select الحضور date using date picker
    ↓
For each student:
  Select one of four buttons:
  - ✅ حضر (Present, green)
  - ❌ غياب (Absent, red)
  - ⚠️ تأخر (Late, yellow)
  - 🔆 ألغيت الحصة (Canceled, gray)
    ↓
Click "حفظ الحضور" (Save Attendance)
    ↓
Attendance record saved with:
  - Group ID
  - Child ID
  - Lesson date
  - Status
  - Teacher name (recorded_by)
```

### 7. View Group Insights

```
Group Details → "نظرة عامة" (Overview) tab
    ↓
See:
  - Total students: 15
  - Weekly lessons: 3
  - Total homework: 8
  - Schedule list with days/times
```

---

## 👨‍👩‍👧 PARENT FLOW

### 1. Add Child

```
Parent Dashboard
    ↓
Click "إضافة طفل" (Add Child)
    ↓
Fill Form:
  - اسم الطفل (Child Name)
  - تاريخ الميلاد (Date of Birth)
  - النوع/الجنس (Gender)
    ↓
Click "إضافة" (Add)
    ↓
Child card appears on dashboard with:
  - Child photo (if set)
  - Basic info
  - Quick access to features
```

### 2. Join Group (NEW!)

```
Parent Dashboard
    ↓
Click "الانضمام لمجموعة" (Join Group)
    ↓
Step 1: Enter Group Code
  - Input field for code (e.g., GRP-ABC123XYZ)
  - Click "البحث" (Search)
    ↓
Step 2: Select Child
  - System shows found group:
    * Group name
    * Subject
    * Type (group/private)
  - Dropdown to select which child to add
  - Click "الانضمام" (Join)
    ↓
Success:
  - Toast message: "تم الانضمام للمجموعة بنجاح!"
  - Redirected to dashboard
  - Group now appears in child's details
```

### 3. View Group Details

```
Child Card → Click
    ↓
See child details with tabs:
  - الجدول (Schedule)
  - الواجبات (Homework)
  - الحضور (Attendance)
  - المصروفات (Expenses)
  - الإشعارات (Notifications)
```

### 4. Check Schedule

```
Child Details → "الجدول" (Schedule) tab
    ↓
See all groups child is enrolled in
For each group:
  - Group name & teacher
  - Weekly schedule:
    * "الأحد 10:00 - 11:00"
    * "الأربعاء 3:00 - 4:00"
    * etc.
```

### 5. View Homework

```
Child Details → "الواجبات" (Homework) tab
    ↓
See all homework assigned to child:
  - From all groups enrolled in
  - Title of assignment
  - Due date (if set)
  - Teacher name
```

### 6. Check Attendance

```
Child Details → "الحضور" (Attendance) tab
    ↓
See attendance summary:
  - Total lessons: 20
  - Attended: 18 (90%)
  - Absent: 1
  - Late: 1

Can view detailed records:
  - Date
  - Subject
  - Status
  - Group name
```

### 7. Track Expenses

```
Child Details → "المصروفات" (Expenses) tab
    ↓
See lessons and related fees:
  - Monthly lessons (شهري)
  - Per-session lessons (بالحصة)
  - Paid status
  - Total costs
```

### 8. Receive Notifications

```
child Details → "الإشعارات" (Notifications) tab
    ↓
See all system notifications:
  - 🔔 حصة قريبة (Lesson reminder - 1h before)
  - 📚 واجب جديد (New homework)
  - ⏰ واجب متأخر (Overdue homework)
  - 💰 رسم قريب (Payment due in 24h)
  - 💸 رسم متأخر (Overdue payment)
  - ❌ الطفل غايب (Child absent)
  - ⏱️ الطفل تأخر (Child late)

Each notification shows:
  - Type badge (color coded)
  - Subject
  - Time ago (e.g., "منذ ساعة")
  - Related lesson/assignment details
```

---

## 🔄 INTERACTION EXAMPLE

### Scenario: Teacher creates group, parent joins, marks attendance

**Day 1 - Teacher Side:**

```
1. Signup as teacher (أحمد محمد, رياضيات)
2. Create group: "مجموعة الرياضيات - الأساسي"
   → System generates: GRP-XYZ789ABC
3. Add schedule: Sunday 10:00-11:00, Wednesday 3:00-4:00
4. Share code GRP-XYZ789ABC with parents via WhatsApp
```

**Day 1 - Parent Side:**

```
1. Signup as parent (محمد علي)
2. Add child: علي محمد (DOB: 2015-05-15)
3. Dashboard → "الانضمام لمجموعة"
4. Enter code: GRP-XYZ789ABC
5. Select child: علي محمد
6. Click "الانضمام"
   ✅ "تم الانضمام للمجموعة بنجاح!"
```

**Day 2 - Teacher Side:**

```
1. Open group: "مجموعة الرياضيات"
   → Members tab shows: علي محمد (joined today)
2. Add homework: "تمارين الفصل 5" (due Sunday 6pm)
3. After Sunday lesson, go to Attendance tab
4. Select date: Sunday (today)
5. Mark: علي محمد → حضر (Present)
6. Save attendance
```

**Day 2 - Parent Side:**

```
1. Open child: علي محمد
2. Homework tab → See "تمارين الفصل 5" from teacher أحمد
3. Schedule tab → See Sunday 10:00-11:00 is over
4. Attendance tab → See "حضر" for today's lesson
5. Notifications tab → See:
   - ✅ حضر: علي حضر اليوم في مجموعة الرياضيات
   - 📚 واجب جديد: تمارين الفصل 5
```

---

## 🎯 Key Differences: Teacher vs Parent

| Feature         | Teacher                                | Parent                      |
| --------------- | -------------------------------------- | --------------------------- |
| **Login**       | Phone + Specialization                 | Phone + Relationship        |
| **Main Screen** | Groups Dashboard                       | Children Dashboard          |
| **Create**      | Groups, Schedule, Homework, Attendance | Children                    |
| **Join**        | N/A                                    | Join groups with code       |
| **View**        | Own groups & their members             | Child's groups & attendance |
| **Edit**        | Group settings, homework, attendance   | Child profile               |
| **Export**      | Attendance reports (future)            | Child transcript (future)   |

---

## 🔐 Access Control (RLS)

**Teachers can ONLY:**

- See their own groups
- Manage their own group members/schedule/homework
- Edit their group attendance records

**Parents can ONLY:**

- See their children
- See groups their children joined
- View attendance/schedule for child's groups
- Cannot modify teacher data

**System prevents:**

- Teacher A seeing Teacher B's groups
- Parent A seeing Parent B's children
- Anyone accessing unauthorized data

---

## 🚀 What's Next?

Once teacher groups are set up:

1. **Notifications** (Complete integration)
   - Parent gets notified when teacher adds homework
   - Parent gets attendance alerts (absent/late)
2. **Mobile App** (Future)
   - Teacher app for attendance QR scanning
   - Parent app with push notifications
3. **Analytics** (Future)
   - Teacher: attendance trends, performance metrics
   - Parent: child progress tracking
4. **Integrations** (Future)
   - Calendar sync (Google Calendar, Outlook)
   - SMS reminders
   - Email notifications

---

**Last Updated**: April 4, 2026
**Status**: ✅ Ready for User Testing
