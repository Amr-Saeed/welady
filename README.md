# 🟢🟢🟢 **COMING SOON: ANDROID & iOS APPLICATIONS!** 🟢🟢🟢


# 🚀 **LOGIN CREDENTIALS (IMPORTANT)**

## 🔐 **Use the following accounts to access the system:**

### 👩 Parent Account

- **Phone:** 01204649275
- **Password:** 101055

### 👨‍🏫 Teacher Account

- **Phone:** 01023358546
- **Password:** 101055

# ** YOU CAN CHECK OUT THE DEMO HERE: https://welady.vercel.app/ ** #

---

# 📱 Welady App

Welady is a mobile-first platform designed to simplify communication and organization between parents and teachers. It focuses on tracking lessons, homework, attendance, and payments in a structured and user-friendly way.

---

# 🎯 Core Concept

- Parent-first experience
- Teachers act as data providers
- Groups are the main connection layer
- Private lessons are handled as single-child groups

---

# 👩‍👧 Parent Features

## 🔐 Authentication

- Phone-based login/signup
- Role-based access control

---

## 🏠 Parent Dashboard

- Personalized greeting (based on relationship)
- Overview of all children
- Quick access to child data

---

## 👶 Child Management

- Add child
- View child details
- Manage multiple children

---

## 🔗 Join Group via Code

- Enter group code provided by teacher
- Assign child to group
- Instant enrollment

---

## 📅 Child Schedule

- Unified schedule view:
  - Group lessons
  - Private lessons
  - Manual lessons

- Add manual lessons
- Attendance decision directly from schedule

---

## ✅ Attendance Management

- Parent can mark:
  - Present
  - Absent (with reason)

- Decision stored in database
- UI locks after submission
- Teacher gets notified

---

## 📚 Homework Tracking

- View homework from:
  - Groups
  - Private lessons
  - Manual entries

- Track status and updates

---

## 💰 Expenses Tracking

- View lesson costs
- Payment status tracking (Paid / Not Paid)
- Per-child financial overview

---

## 📊 Attendance Analytics

- Total attendance summary
- Subject-based breakdown
- Per-child insights

---

## 🔔 Notifications Center

- Global notification bell
- Per-child notifications page
- Types:
  - Homework
  - Attendance
  - Payments
  - Schedule
  - Enrollment changes

---

# 👨‍🏫 Teacher Features

## 🧑‍🏫 Teacher Dashboard

- View all groups
- KPI metrics and analytics
- Payment tracking overview

---

## 👥 Group Management

- Create group
- Define:
  - Subject
  - Schedule
  - Monthly fee

- Conflict detection with private lessons
- Inline and toast error handling

---

## 📄 Group Details

Tabs include:

- Overview
- Members
- Schedule
- Homework
- Attendance
- Payments

---

## 👶 Student Management

- View children in group
- Remove student (with reason)
- Parent gets notified

---

## 📚 Homework Management

- Add homework to:
  - Entire group
  - Specific child

- Homework analytics per student

---

## 📅 Attendance Tracking

- Record attendance per session
- Status options:
  - Present
  - Absent
  - Late

- Data stored per student/date
- Status locking after submission

---

## 💰 Payment Tracking

- Track payments per:
  - Group
  - Private lesson

- Mark:
  - Paid
  - Not Paid

- Lock status after first update

---

## 🔔 Teacher Notifications

- Parent attendance decisions
- New student joins
- Payment updates
- System alerts

---

## 📊 Analytics

### Teacher-Level

- KPIs
- Monthly trends
- Payment distribution

### Student-Level

- Attendance analytics
- Homework performance

---

## 🔒 Private Lessons Support

- Treated as single-child groups
- Dedicated:
  - Attendance tracking
  - Payment tracking
  - Analytics

---

# 🔔 Notification System

## Current Architecture

- Hybrid system:
  - Client-generated (derived)
  - LocalStorage-based (manual)
  - Partial DB-backed events

---

## Notification Types

### 👩 Parent

- Lesson reminders
- Homework alerts (including overdue)
- Payment alerts (due & overdue)
- Attendance alerts
- Enrollment updates

---

### 👨‍🏫 Teacher

- Parent attendance decisions
- New student joins
- Payment updates

---

## Features

- Deduplication logic
- Read/unread tracking
- Role-based routing
- Notification feeds:
  - Global (header)
  - Child-level
  - Detail view

---

## Current Limitations

- LocalStorage-based (not cross-device)
- No push notifications yet
- No centralized notifications table
- Client-side computation for most events

---

# 🧱 Tech Stack

| Layer              | Technology                     |
| ------------------ | ------------------------------ |
| Frontend           | React Native / React.js        |
| Backend            | Supabase                       |
| Database           | PostgreSQL (via Supabase)      |
| Authentication     | Supabase Auth (Phone-based)    |
| State Management   | Custom Hooks                   |
| Notifications      | Hybrid (Client + LocalStorage) |
| Realtime (Planned) | Supabase Realtime              |
| Push (Planned)     | Firebase Cloud Messaging (FCM) |

---

# 🚀 Future Improvements

- Push notifications (FCM)
- Centralized notifications table
- Server-side scheduling (cron jobs)
- Automated payment integration
- Advanced reporting system
- Cross-device notification sync

---

# 🧠 Summary

Walady is a structured system that replaces chaotic communication (e.g., WhatsApp) with:

- Clear schedules
- Organized homework
- Accurate attendance
- Transparent payments
- Actionable notifications

---

# ⚡ Status

- ✅ Core system implemented
- 🟡 Notifications infrastructure partially implemented
- 🔜 Scaling to production-ready architecture

---
