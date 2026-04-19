import { useMemo } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IoChevronForward } from "react-icons/io5";
import {
  BsBell,
  BsBook,
  BsCalendar3,
  BsCash,
  BsExclamationTriangle,
  BsPersonX,
} from "react-icons/bs";
import { useChildById } from "../Features/Parents/useChildInfo";
import { useManualLessonsByChild } from "../Features/Parents/useManualLessons";
import { useHomeworksByChild } from "../Features/Parents/useHomework";
import { useLessonExpensesByChild } from "../Features/Parents/useLessonExpenses";
import { setLessonAttendanceStatus } from "../Services/apiAttendance";
import {
  buildChildNotifications,
  markManualNotificationResolved,
} from "../Services/apiNotifications";
import { getChildEnrollmentRemovals } from "../Services/apiEnrollmentRemovals";
import toast from "react-hot-toast";
import { formatArabicDateTime } from "../Utils/helper";
import { useChildAttendanceRecords } from "../Features/Parents/useAttendance";

function ChildNotifications() {
  const navigate = useNavigate();
  const { childId } = useParams();

  const {
    data: child,
    isLoading: isChildLoading,
    error: childError,
  } = useChildById(childId);
  const { data: lessons = [], isLoading: isLessonsLoading } =
    useManualLessonsByChild(childId);
  const { data: homeworks = [], isLoading: isHomeworkLoading } =
    useHomeworksByChild(childId);
  const { data: expenses = [], isLoading: isExpensesLoading } =
    useLessonExpensesByChild(childId);
  const { data: enrollmentRemovals = [], isLoading: isRemovalsLoading } =
    useQuery({
      queryKey: ["childEnrollmentRemovals", childId],
      queryFn: () => getChildEnrollmentRemovals(childId),
      enabled: !!childId,
      retry: 1,
    });
  const { data: attendanceRecords = [] } = useChildAttendanceRecords(childId);
  const [updatingId, setUpdatingId] = useState(null);
  const [resolvedIds, setResolvedIds] = useState({});

  const notifications = useMemo(
    () =>
      buildChildNotifications({
        childId,
        lessons,
        homeworks,
        expenses,
        attendanceRecords,
      }),
    [childId, lessons, homeworks, expenses, attendanceRecords],
  );

  const dbRemovalNotifications = useMemo(
    () =>
      (enrollmentRemovals || []).map((item) => ({
        id: `enrollment-removal-${item.id}`,
        childId,
        type: "enrollment_removal",
        title:
          item.removalType === "group"
            ? "إزالة من المجموعة"
            : "إزالة من الدروس الخصوصية",
        message: `المعلم: ${item.teacherName || "المدرس"} | السبب: ${item.reason}`,
        createdAt: item.removedAt || item.created_at,
        source: "database",
      })),
    [childId, enrollmentRemovals],
  );

  const allNotifications = useMemo(
    () =>
      [...dbRemovalNotifications, ...notifications].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      ),
    [dbRemovalNotifications, notifications],
  );

  const iconByType = (type) => {
    if (type === "lesson_reminder")
      return <BsCalendar3 className="text-cyan-600" />;
    if (type === "lesson_added")
      return <BsCalendar3 className="text-emerald-600" />;
    if (type === "schedule_added" || type === "schedule_updated")
      return <BsCalendar3 className="text-violet-600" />;
    if (
      type === "homework_new" ||
      type === "homework_overdue" ||
      type === "homework_updated" ||
      type === "homework_status_updated" ||
      type === "homework_deleted"
    ) {
      return <BsBook className="text-amber-600" />;
    }
    if (type === "payment_before_due" || type === "payment_overdue") {
      return <BsCash className="text-red-600" />;
    }
    if (type === "payment_status_updated") {
      return <BsCash className="text-emerald-600" />;
    }
    if (type === "attendance_absent" || type === "attendance_late") {
      return <BsPersonX className="text-rose-600" />;
    }
    if (type === "lesson_canceled")
      return <BsCalendar3 className="text-red-600" />;
    if (type === "attendance_decision")
      return <BsPersonX className="text-blue-600" />;
    if (type === "private_lesson_removed" || type === "group_member_removed") {
      return <BsPersonX className="text-red-600" />;
    }
    if (type === "enrollment_removal")
      return <BsPersonX className="text-red-600" />;
    return <BsBell className="text-gray-600" />;
  };

  const badgeClassByType = (type) => {
    if (
      type === "homework_overdue" ||
      type === "payment_overdue" ||
      type === "attendance_absent"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (type === "attendance_late") return "bg-orange-100 text-orange-700";
    if (type === "payment_status_updated") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (type === "lesson_canceled") return "bg-red-100 text-red-700";
    if (type === "attendance_decision") return "bg-blue-100 text-blue-700";
    if (type === "private_lesson_removed" || type === "group_member_removed") {
      return "bg-red-100 text-red-700";
    }
    if (type === "enrollment_removal") return "bg-red-100 text-red-700";
    if (type === "lesson_added") return "bg-emerald-100 text-emerald-700";
    if (type === "homework_updated") return "bg-blue-100 text-blue-700";
    if (type === "homework_status_updated") return "bg-teal-100 text-teal-700";
    if (type === "homework_deleted") return "bg-red-100 text-red-700";
    if (type === "schedule_added" || type === "schedule_updated") {
      return "bg-violet-100 text-violet-700";
    }

    if (type === "lesson_reminder" || type === "payment_before_due") {
      return "bg-cyan-100 text-cyan-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const typeLabel = (type) => {
    if (type === "lesson_reminder") return "تذكير درس";
    if (type === "homework_new") return "واجب جديد";
    if (type === "homework_overdue") return "واجب متأخر";
    if (type === "homework_updated") return "تعديل واجب";
    if (type === "homework_status_updated") return "تحديث حالة واجب";
    if (type === "homework_deleted") return "حذف واجب";
    if (type === "payment_before_due") return "تذكير دفع";
    if (type === "payment_overdue") return "دفع متأخر";
    if (type === "payment_status_updated") return "تحديث حالة دفع";
    if (type === "attendance_absent") return "غياب";
    if (type === "attendance_late") return "تأخير";
    if (type === "lesson_canceled") return "إلغاء حصة";
    if (type === "attendance_decision") return "تأكيد حضور";
    if (type === "private_lesson_removed") return "إزالة من درس خصوصي";
    if (type === "group_member_removed") return "إزالة من مجموعة";
    if (type === "enrollment_removal") return "سجل إزالة";
    if (type === "lesson_added") return "حصة جديدة";
    if (type === "schedule_added") return "إضافة حصة";
    if (type === "schedule_updated") return "تعديل جدول";
    return "إشعار";
  };

  const handleParentAttendanceChoice = async (notification, status) => {
    const payload = notification.payload || {};
    if (!payload.lessonDate) {
      toast.error("بيانات الإشعار غير مكتملة");
      return;
    }

    try {
      setUpdatingId(notification.id);
      await setLessonAttendanceStatus({
        childId,
        childName: child?.name || "الطفل",
        lesson: {
          groupID: payload.groupId || null,
          privateLessonID: payload.privateLessonId || null,
          manualLessonID: payload.manualLessonId || null,
          date: payload.lessonDate,
          subject: payload.subject || notification.title || "الحصة",
          teacherName: payload.teacherName || "",
        },
        status,
        notes: payload.reason || "تم التحديث من ولي الأمر عبر الإشعارات",
      });

      markManualNotificationResolved(notification.id, {
        parentStatus: status,
        resolvedAt: new Date().toISOString(),
      });

      setResolvedIds((previous) => ({ ...previous, [notification.id]: true }));
      toast.success("تم حفظ حالة الحضور");
    } catch (error) {
      console.error(error);
      toast.error("تعذر حفظ حالة الحضور");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDateTime = (value) => formatArabicDateTime(value);

  if (isChildLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        جاري التحميل...
      </div>
    );
  }

  if (childError || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        حدث خطأ في تحميل الإشعارات
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 pb-8 max-w-md mx-auto">
      <div className="bg-white border-b border-gray-200 px-4 py-4 relative">
        <button
          onClick={() => navigate(`/parent/child/${childId}`)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700"
        >
          <IoChevronForward className="text-2xl" />
        </button>
        <h1 className="text-2xl font-bold text-center text-gray-900">
          الإشعارات
        </h1>
        <p className="text-center text-sm text-gray-500 mt-1">{child.name}</p>
      </div>

      <div className="px-4 pt-5 space-y-3">
        {(isLessonsLoading ||
          isHomeworkLoading ||
          isExpensesLoading ||
          isRemovalsLoading) && (
          <div className="text-sm text-gray-600">
            جاري تحميل بيانات الإشعارات...
          </div>
        )}

        {!isLessonsLoading &&
          !isHomeworkLoading &&
          !isExpensesLoading &&
          allNotifications.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
              لا توجد إشعارات حالياً.
            </div>
          )}

        {allNotifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {iconByType(notification.type)}
                <h3 className="font-bold text-gray-900">
                  {notification.title}
                </h3>
              </div>
              <span
                className={`text-xs px-2 py-1 text-center rounded-full font-semibold ${badgeClassByType(notification.type)}`}
              >
                {typeLabel(notification.type)}
              </span>
            </div>
            <p className="text-sm text-gray-700">{notification.message}</p>

            {notification.type === "attendance_decision" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {notification.payload?.resolved ||
                resolvedIds[notification.id] ? (
                  <span className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                    تم تثبيت الحالة من ولي الأمر
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        handleParentAttendanceChoice(notification, "attending")
                      }
                      disabled={updatingId === notification.id}
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      حضر
                    </button>
                    <button
                      onClick={() =>
                        handleParentAttendanceChoice(notification, "absent")
                      }
                      disabled={updatingId === notification.id}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      غاب
                    </button>
                    <button
                      onClick={() =>
                        handleParentAttendanceChoice(notification, "late")
                      }
                      disabled={updatingId === notification.id}
                      className="rounded-lg bg-yellow-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      تأخر
                    </button>
                  </>
                )}
              </div>
            ) : null}

            <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <BsExclamationTriangle className="text-gray-400" />
              {formatDateTime(notification.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChildNotifications;
