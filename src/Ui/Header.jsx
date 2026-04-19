import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { MdNotifications } from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";
import { useParentProfile } from "../Features/Parents/useParentProfile";
import { useTeacherProfile } from "../Features/Teachers/useTeacherProfile";
import { useChildrenByParent } from "../Features/Parents/useChildInfo";
import { getManualLessonsByChildId } from "../Services/apiManualLessons";
import { getHomeworksByChildId } from "../Services/apiHomework";
import { getLessonExpensesByChildId } from "../Services/apiLessonExpenses";
import { getChildAttendanceRecords } from "../Services/apiAttendance";
import {
  buildChildNotifications,
  getManualTeacherNotifications,
  isNotificationRead,
  markNotificationRead,
} from "../Services/apiNotifications";
import { getChildrenEnrollmentRemovals } from "../Services/apiEnrollmentRemovals";
import { BiLogOut } from "react-icons/bi";
import { useMutation } from "@tanstack/react-query";
import ConfirmModal from "./ConfirmModal";
import { signOut } from "../Services/apiAuth";

function targetRouteForNotification(notification) {
  if (notification?.audience === "teacher") {
    const type = notification?.type;
    const payload = notification?.payload || {};
    const groupId = payload.groupId;
    const privateLessonId = payload.privateLessonId;
    const manualLessonId = payload.manualLessonId;

    if (type === "payment_status_updated") {
      return `/teacher/analytics`;
    }

    if (type === "group_member_joined") {
      if (groupId) return `/teacher/group/${groupId}`;
      return `/teacher/dashboard`;
    }

    if (type === "attendance_decision") {
      if (groupId) return `/teacher/group/${groupId}`;
      if (privateLessonId || manualLessonId) return `/teacher/lessons`;
      return `/teacher/dashboard`;
    }

    return `/teacher/dashboard`;
  }

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

  if (
    type === "private_lesson_removed" ||
    type === "group_member_removed" ||
    type === "enrollment_removal"
  ) {
    return `/parent/child/${childId}/notifications`;
  }

  return `/parent/child/${childId}`;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [readVersion, setReadVersion] = useState(0);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
  });
  const menuRef = useRef(null);

  const isParentArea = location.pathname.startsWith("/parent");
  const isTeacherArea = location.pathname.startsWith("/teacher");
  const canShowNotifications = isParentArea || isTeacherArea;

  const { data: parentProfile } = useParentProfile(isParentArea);
  const { data: teacherProfile } = useTeacherProfile(isTeacherArea);
  const { data: children = [] } = useChildrenByParent(parentProfile?.id);
  const childIds = children.map((child) => child.id).filter(Boolean);

  const lessonsQueries = useQueries({
    queries: childIds.map((childId) => ({
      queryKey: ["headerLessons", childId],
      queryFn: () => getManualLessonsByChildId(childId),
      enabled: Boolean(isParentArea && childId),
      retry: 1,
    })),
  });

  const homeworkQueries = useQueries({
    queries: childIds.map((childId) => ({
      queryKey: ["headerHomeworks", childId],
      queryFn: () => getHomeworksByChildId(childId),
      enabled: Boolean(isParentArea && childId),
      retry: 1,
    })),
  });

  const expensesQueries = useQueries({
    queries: childIds.map((childId) => ({
      queryKey: ["headerExpenses", childId],
      queryFn: () => getLessonExpensesByChildId(childId),
      enabled: Boolean(isParentArea && childId),
      retry: 1,
    })),
  });

  const attendanceQueries = useQueries({
    queries: childIds.map((childId) => ({
      queryKey: ["headerAttendance", childId],
      queryFn: () => getChildAttendanceRecords(childId),
      enabled: Boolean(isParentArea && childId),
      retry: 1,
    })),
  });

  const { data: removals = [] } = useQuery({
    queryKey: ["headerEnrollmentRemovals", childIds.join("|")],
    queryFn: () => getChildrenEnrollmentRemovals(childIds),
    enabled: Boolean(isParentArea && childIds.length > 0),
    retry: 1,
  });

  const parentNotifications = useMemo(() => {
    if (!isParentArea || childIds.length === 0) return [];

    const byChild = childIds.flatMap((childId, index) => {
      const lessons = lessonsQueries[index]?.data || [];
      const homeworks = homeworkQueries[index]?.data || [];
      const expenses = expensesQueries[index]?.data || [];
      const attendanceRecords = attendanceQueries[index]?.data || [];
      const childName =
        children.find((child) => child.id === childId)?.name || "الطفل";

      return buildChildNotifications({
        childId,
        lessons,
        homeworks,
        expenses,
        attendanceRecords,
      }).map((item) => ({ ...item, childName }));
    });

    const removalNotifications = (removals || []).map((item) => ({
      id: `enrollment-removal-${item.id}`,
      childId: item.childID,
      childName:
        children.find((child) => child.id === item.childID)?.name || "الطفل",
      type: "enrollment_removal",
      title:
        item.removalType === "group"
          ? "إزالة من المجموعة"
          : "إزالة من الدروس الخصوصية",
      message: `المعلم: ${item.teacherName || "المدرس"} | السبب: ${item.reason}`,
      createdAt: item.removedAt || item.created_at,
      source: "database",
    }));

    return [...byChild, ...removalNotifications]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, 30);
  }, [
    isParentArea,
    childIds,
    lessonsQueries,
    homeworkQueries,
    expensesQueries,
    attendanceQueries,
    removals,
    children,
  ]);

  const teacherNotifications = useMemo(() => {
    if (!isTeacherArea || !teacherProfile?.id) return [];

    return getManualTeacherNotifications(teacherProfile.id)
      .map((item) => ({
        ...item,
        audience: "teacher",
      }))
      .slice(0, 30);
  }, [isTeacherArea, teacherProfile]);

  const notifications = isTeacherArea
    ? teacherNotifications
    : parentNotifications;

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !isNotificationRead(notification.id) || readVersion < 0,
      ).length,
    [notifications, readVersion],
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleNotificationClick = (notification) => {
    markNotificationRead(notification.id);
    setReadVersion((value) => value + 1);
    setIsMenuOpen(false);
    navigate(targetRouteForNotification(notification));
  };

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      navigate("/"); // Change to your login/landing route
    },
  });

  function handleSignOut() {
    setConfirmModal({ isOpen: true, type: "logout" });
  }

  function handleConfirmAction() {
    if (confirmModal.type === "logout") {
      signOutMutation.mutate();
    }
    setConfirmModal({ isOpen: false, type: null });
  }

  return (
    <header
      dir="rtl"
      className="flex justify-between items-center p-4 border-b border-gray-300"
    >
      <nav
        className="relative flex gap-4 items-center justify-between w-full"
        ref={menuRef}
      >
        {canShowNotifications ? (
          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className="relative rounded-full p-1.5 hover:bg-gray-100"
            title="الإشعارات"
          >
            <MdNotifications className="text-2xl cursor-pointer" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-[1.2rem] rounded-full bg-red-600 px-1 text-center text-xs font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>
        ) : (
          <MdNotifications className="text-2xl text-gray-300" />
        )}
        <img
          src="../../public/welady.png"
          alt="Weladi Logo"
          className="h-12 w-12"
        />

        <button
          onClick={handleSignOut}
          disabled={signOutMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600 disabled:bg-gray-400"
        >
          <BiLogOut className="text-xl" />
          تسجيل خروج
        </button>

        {canShowNotifications && isMenuOpen ? (
          <div
            className="absolute z-50 w-80 max-w-[90vw] rounded-xl border border-gray-200 bg-white shadow-xl"
            style={{ right: "-6px", top: "43px" }}
          >
            <span className="absolute -top-3 right-4 h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-200" />
            <span className="absolute -top-2 right-4 h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white" />
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <p className="font-bold text-gray-800">الإشعارات</p>
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
                      type="button"
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full border-b border-gray-100 px-3 py-2 text-right hover:bg-gray-50 ${isUnread ? "bg-blue-50" : "bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                            {notification.childName
                              ? `${notification.childName}: ${notification.message}`
                              : notification.message}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {notification.createdAt
                              ? new Date(notification.createdAt).toLocaleString(
                                  "ar-EG",
                                )
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
      </nav>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={"تسجيل الخروج"}
        message={"هل أنت متأكد من رغبتك في تسجيل الخروج؟"}
        confirmText="تأكيد"
        cancelText="إلغاء"
        isDangerous={true}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, type: null })}
      />
    </header>
  );
}
