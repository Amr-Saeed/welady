import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdNotifications } from "react-icons/md";
import { IoChevronForward } from "react-icons/io5";
import ScheduleCard from "../Features/Parents/Children/ScheduleCard";
import HomeworkCard from "../Features/Parents/Children/HomeworkCard";
import ExpensesCard from "../Features/Parents/Children/ExpensesCard";
import AttendanceSummaryCard from "../Features/Parents/Children/AttendanceSummaryCard";
import NotificationsCard from "../Features/Parents/Children/NotificationsCard";
import {
  useChildById,
  useUpcomingLessonsByChild,
} from "../Features/Parents/useChildInfo";
import {
  useHomeworksByChild,
  useHomeworkStatuses,
} from "../Features/Parents/useHomework";
import { useLessonExpensesByChild } from "../Features/Parents/useLessonExpenses";
import { useQuery } from "@tanstack/react-query";
import { getChildEnrollmentRemovals } from "../Services/apiEnrollmentRemovals";
import {
  buildChildNotifications,
  isNotificationRead,
  markNotificationRead,
} from "../Services/apiNotifications";
import { useChildAttendanceRecords } from "../Features/Parents/useAttendance";

function targetRouteForNotification(notification) {
  const childId = notification?.childId;
  const type = notification?.type;

  if (!childId) return "/parent";

  if (
    type === "homework_new" ||
    type === "homework_overdue" ||
    type === "homework_updated" ||
    type === "homework_status_updated" ||
    type === "homework_deleted"
  ) {
    return `/parent/child/${childId}/homework`;
  }

  if (
    type === "payment_before_due" ||
    type === "payment_overdue" ||
    type === "payment_status_updated"
  ) {
    return `/parent/child/${childId}/expenses`;
  }

  if (
    type === "attendance_absent" ||
    type === "attendance_late" ||
    type === "attendance_decision"
  ) {
    return `/parent/child/${childId}/attendance-summary`;
  }

  if (
    type === "lesson_reminder" ||
    type === "lesson_added" ||
    type === "schedule_added" ||
    type === "schedule_updated" ||
    type === "lesson_canceled"
  ) {
    return `/parent/child/${childId}/schedule`;
  }

  return `/parent/child/${childId}/notifications`;
}

function formatEGP(value) {
  return `${Number(value || 0).toLocaleString("en-US")} ج.م`;
}

function isCurrentMonth(value, today) {
  if (!value) return false;
  const date = new Date(value);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}

function isCurrentWeek(value, now) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}

function ChildDetail() {
  const navigate = useNavigate();
  const { childId } = useParams();
  const menuRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [, setReadVersion] = useState(0);
  const { data: child, isLoading, error } = useChildById(childId);
  const { data: upcomingLessons = [] } = useUpcomingLessonsByChild(childId);
  const { data: homeworks = [] } = useHomeworksByChild(childId);
  const homeworkIds = homeworks.map((homework) => homework.id);
  const { data: homeworkStatuses = [] } = useHomeworkStatuses(
    childId,
    homeworkIds,
  );
  const { data: expenses = [] } = useLessonExpensesByChild(childId);
  const { data: attendanceRecords = [] } = useChildAttendanceRecords(childId);
  const { data: enrollmentRemovals = [] } = useQuery({
    queryKey: ["childEnrollmentRemovals", childId],
    queryFn: () => getChildEnrollmentRemovals(childId),
    enabled: !!childId,
    retry: 1,
  });

  console.log("upcomingLessons", upcomingLessons);
  console.log("homeworks", homeworks);
  console.log("expenses", expenses);
  console.log("enrollmentRemovals", enrollmentRemovals);
  console.log("attendanceRecords", attendanceRecords);

  const notifications = useMemo(() => {
    const lessonNotifications = buildChildNotifications({
      childId,
      lessons: upcomingLessons,
      homeworks,
      expenses,
      attendanceRecords,
    });

    const removalNotifications = (enrollmentRemovals || []).map((item) => ({
      id: `enrollment-removal-${item.id}`,
      childId,
      type: "enrollment_removal",
      title:
        item.removalType === "group"
          ? "إزالة من المجموعة"
          : "إزالة من الدرس الخصوصي",
      message: `المعلم: ${item.teacherName || "المدرس"} | السبب: ${item.reason}`,
      createdAt: item.removedAt || item.created_at,
      source: "database",
    }));

    return [...lessonNotifications, ...removalNotifications].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  }, [
    childId,
    upcomingLessons,
    homeworks,
    expenses,
    attendanceRecords,
    enrollmentRemovals,
  ]);

  const unreadCount = notifications.filter(
    (notification) => !isNotificationRead(notification.id),
  ).length;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleNotificationClick = (notification) => {
    markNotificationRead(notification.id);
    setReadVersion((value) => value + 1);
    setIsMenuOpen(false);
    navigate(targetRouteForNotification(notification));
  };

  const statusByHomeworkId = homeworkStatuses.reduce((accumulator, row) => {
    accumulator[row.homeworkID] = String(row.status || "").toLowerCase();
    return accumulator;
  }, {});

  const homeworkDoneCount = homeworks.filter(
    (item) => statusByHomeworkId[item.id] === "done",
  ).length;
  const homeworkPendingCount = Math.max(
    homeworks.length - homeworkDoneCount,
    0,
  );

  const now = new Date();
  const currentMonthExpenses = expenses.filter((expense) =>
    isCurrentMonth(expense.month, now),
  );
  const totalMonthAmount = currentMonthExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );
  const totalWeekAmount = expenses
    .filter((expense) =>
      isCurrentWeek(expense.created_at || expense.month, now),
    )
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const unpaidExpensesCount = expenses.filter(
    (expense) => String(expense.status || "").toLowerCase() !== "paid",
  ).length;

  const attendanceSummary = useMemo(() => {
    return attendanceRecords.reduce(
      (accumulator, record) => {
        accumulator.total += 1;
        if (record.status === "attended") accumulator.attended += 1;
        if (record.status === "child_absent") accumulator.absent += 1;
        if (record.status === "child_late") accumulator.late += 1;
        if (record.status === "teacher_canceled") accumulator.canceled += 1;
        return accumulator;
      },
      { total: 0, attended: 0, absent: 0, late: 0, canceled: 0 },
    );
  }, [attendanceRecords]);

  const nextLesson = upcomingLessons[0] || null;
  const nextLessonLabel = nextLesson
    ? `${nextLesson.subject || "حصة"} • ${nextLesson.day || "موعد قريب"}`
    : "لا توجد حصص قادمة";
  const nextLessonDetail = nextLesson
    ? `${nextLesson.typeLabel || "درس"} • ${nextLesson.location || "غير محدد"}`
    : "";

  const homeworkSummary =
    homeworks.length > 0
      ? `${homeworkPendingCount} واجب قيد الإنجاز`
      : "لا توجد واجبات حالياً";
  const homeworkDetail =
    homeworks.length > 0
      ? `${homeworkDoneCount} واجب مكتمل`
      : "تابعي صفحة الواجبات لمراجعة كل جديد";

  const attendanceSummaryText =
    attendanceSummary.total > 0
      ? `${attendanceSummary.attended} حضور من ${attendanceSummary.total}`
      : "لا توجد سجلات حضور بعد";
  const attendanceDetail =
    attendanceSummary.total > 0
      ? `غياب ${attendanceSummary.absent} • تأخير ${attendanceSummary.late} • إلغاء ${attendanceSummary.canceled}`
      : "";

  const notificationsSummary =
    unreadCount > 0
      ? `${unreadCount} إشعار غير مقروء`
      : "لا توجد إشعارات جديدة";
  const notificationsDetail =
    notifications.length > 0
      ? `آخر تحديث: ${new Date(notifications[0].createdAt).toLocaleString("ar-EG")}`
      : "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-red-600">حدث خطأ في تحميل بيانات الطفل</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-8">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <button
            onClick={() => navigate("/parent")}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <IoChevronForward className="text-2xl" />
            <span className="text-lg font-semibold">تفاصيل الطفل</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
              className="relative rounded-full p-2 hover:bg-gray-100"
              title="الإشعارات"
            >
              <MdNotifications className="text-2xl text-gray-700" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-[1.2rem] rounded-full bg-red-600 px-1 text-center text-xs font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>

            {isMenuOpen ? (
              <div
                className="absolute z-50 w-80 max-w-[90vw] rounded-xl border border-gray-200 bg-white shadow-xl"
                style={{ left: "-4px", top: "3.2rem" }}
              >
                <span className="absolute -top-3 left-4 h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-200" />
                <span className="absolute -top-2 left-4 h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white" />

                <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                  <p className="font-bold text-gray-800">إشعارات الطفل</p>
                  <span className="text-xs text-gray-500">
                    غير مقروء: {unreadCount}
                  </span>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-gray-500">
                      لا توجد إشعارات حالياً
                    </p>
                  ) : (
                    notifications.map((notification) => {
                      const isUnread = !isNotificationRead(notification.id);

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full border-b border-gray-100 px-3 py-2 text-right hover:bg-gray-50 ${isUnread ? "bg-blue-50" : "bg-white"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-gray-800">
                                {notification.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                                {notification.message}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-400">
                                {notification.createdAt
                                  ? new Date(
                                      notification.createdAt,
                                    ).toLocaleString("ar-EG")
                                  : ""}
                              </p>
                            </div>
                            {isUnread ? (
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Child Info */}
      <div className="max-w-4xl mx-auto px-6 mt-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-1 text-center">
          {child.name}
        </h2>
        <p className="text-lg text-gray-600 mb-6 text-center">{child.grade}</p>

        {/* Detail Cards */}
        <div className="mt-6 space-y-4">
          <ScheduleCard
            summary={nextLessonLabel}
            detail={nextLessonDetail}
            onClick={() => navigate(`/parent/child/${childId}/schedule`)}
          />
          <HomeworkCard
            summary={homeworkSummary}
            detail={homeworkDetail}
            onClick={() => navigate(`/parent/child/${childId}/homework`)}
          />
          <ExpensesCard
            weekLabel={formatEGP(totalWeekAmount)}
            monthLabel={formatEGP(totalMonthAmount)}
            unpaidLabel={`${unpaidExpensesCount} مصروفات لم تُدفع`}
            onClick={() => navigate(`/parent/child/${childId}/expenses`)}
          />
          <AttendanceSummaryCard
            summary={attendanceSummaryText}
            detail={attendanceDetail}
            onClick={() =>
              navigate(`/parent/child/${childId}/attendance-summary`)
            }
          />
          <NotificationsCard
            summary={notificationsSummary}
            detail={notificationsDetail}
            onClick={() => navigate(`/parent/child/${childId}/notifications`)}
          />
        </div>
      </div>
    </div>
  );
}

export default ChildDetail;
