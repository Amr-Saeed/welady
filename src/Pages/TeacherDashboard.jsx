import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BiBook, BiCopy, BiLineChart, BiPlus, BiTrash } from "react-icons/bi";
import toast from "react-hot-toast";
import { deleteGroup, getTeacherGroups } from "../Services/apiGroups";
import { getTeacherChildren } from "../Services/apiTeacherChildren";
import { getTeacherProfile } from "../Services/apiAuth";
import CreateGroupModal from "../Features/Teachers/TeacherDashboard/CreateGroupModal";
import ConfirmModal from "../Ui/ConfirmModal";
import { formatScheduleRange } from "../Features/Teachers/GroupDetails/groupDetailsUtils";

function TeacherDashboard() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    groupId: null,
    groupName: null,
  });

  const {
    data: teacherProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["teacherProfile"],
    queryFn: getTeacherProfile,
    retry: 1,
  });

  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["teacherGroups"],
    queryFn: getTeacherGroups,
    retry: 1,
  });

  const { data: privateLessons = [] } = useQuery({
    queryKey: ["teacherPrivateLessons"],
    queryFn: getTeacherChildren,
    retry: 1,
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      toast.success("تم إلغاء المجموعة");
      refetchGroups();
    },
    onError: (error) => {
      toast.error(error?.message || "خطأ في إلغاء المجموعة");
      console.error(error);
    },
  });

  useEffect(() => {
    if (profileError) {
      navigate("/login/teachers", { replace: true });
    }
  }, [profileError, navigate]);

  const handleCopyGroupCode = async (event, groupCode) => {
    event.stopPropagation();

    if (!groupCode) {
      toast.error("لا يوجد كود للمجموعة");
      return;
    }

    try {
      await navigator.clipboard.writeText(groupCode);
      toast.success("تم نسخ كود المجموعة");
    } catch (error) {
      console.error(error);
      toast.error("تعذر نسخ كود المجموعة");
    }
  };

  const handleDeleteGroup = (event, group) => {
    event.stopPropagation();

    setConfirmModal({
      isOpen: true,
      type: "deleteGroup",
      groupId: group.id,
      groupName: group.name,
    });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === "deleteGroup") {
      deleteGroupMutation.mutate(confirmModal.groupId);
    }
    setConfirmModal({
      isOpen: false,
      type: null,
      groupId: null,
      groupName: null,
    });
  };

  const groupsPolicyError = groupsError?.code === "42P17";

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-lg text-gray-700">جاري التحميل...</p>
      </div>
    );
  }

  const groupStudentTotal =
    groups?.reduce(
      (sum, group) => sum + (group.group_members_aggregate?.count || 0),
      0,
    ) || 0;

  const privateLessonStudentsCount =
    new Set(
      (privateLessons || []).map((lesson) => lesson.childID).filter(Boolean),
    ).size || 0;

  const privateLessonsCount = privateLessons?.length || 0;

  const totalStudentsOverall = groupStudentTotal + privateLessonStudentsCount;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              مرحباً أستاذ/ة {teacherProfile?.name}
            </h1>
            <p className="mt-1 text-gray-600">
              التخصص:{" "}
              <span className="font-semibold">
                {teacherProfile?.specialization}
              </span>
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-gray-600">عدد المجموعات</p>
            <p className="mt-2 text-4xl font-bold text-purple-600">
              {groups?.length || 0}
            </p>
            <p className="text-sm text-gray-600"> عدد الدروس الخصوصية</p>
            <p className="mt-2 text-4xl font-bold text-blue-600">
              {privateLessonsCount}
            </p>
          </div>
          <div className=" rounded-xl bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              تفاصيل الطلاب
            </h3>

            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-gray-700">
                إجمالي الطلاب في المجموعات والدروس الخصوصية:
                <span className="mr-2 text-xl font-bold text-blue-700">
                  {totalStudentsOverall}
                </span>
              </p>
            </div>

            <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p>
                طلاب المجموعات:{" "}
                <span className="font-bold">{groupStudentTotal}</span>
              </p>
              <p>
                طلاب الدروس الخصوصية:{" "}
                <span className="font-bold">{privateLessonStudentsCount}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-3 font-semibold text-gray-800">المجموعات</p>
                {!groups || groups.length === 0 ? (
                  <p className="text-sm text-gray-500">لا توجد مجموعات بعد</p>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <span className="text-sm text-gray-700">
                          {group.name}
                        </span>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                          {group.group_members_aggregate?.count || 0} طالب
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-3 font-semibold text-gray-800">
                  الدروس الخصوصية
                </p>
                {privateLessonsCount === 0 ? (
                  <p className="text-sm text-gray-500">
                    لا توجد دروس خصوصية بعد
                  </p>
                ) : (
                  <div className="space-y-2">
                    {privateLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-700">
                            {lesson.children?.name || "طالب"}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {lesson.subject || "بدون مادة"}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {lesson.lessonDay?.[0] || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-gray-600">الحالة</p>
            <p className="mt-2 text-xl font-bold text-green-600">نشط</p>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-bold text-white transition hover:from-purple-700 hover:to-blue-700"
          >
            <BiPlus className="text-2xl" />
            إنشاء مجموعة جديدة
          </button>

          <button
            onClick={() => navigate("/teacher/lessons")}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-8 py-4 text-lg font-bold text-white transition hover:from-indigo-700 hover:to-cyan-700"
          >
            <BiBook className="text-2xl" />
            إدارة الدروس الخصوصية
          </button>

          <button
            onClick={() => navigate("/teacher/analytics")}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-sky-600 px-8 py-4 text-lg font-bold text-white transition hover:from-emerald-700 hover:to-sky-700"
          >
            <BiLineChart className="text-2xl" />
            التحليلات المتقدمة
          </button>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-bold text-gray-800">المجموعات</h2>

          {groupsLoading ? (
            <p className="text-center text-gray-600">جاري التحميل...</p>
          ) : groupsPolicyError ? (
            <div className="rounded-xl border border-amber-200 bg-white p-8 text-center shadow">
              <p className="mb-2 font-bold text-amber-700">
                سياسة Supabase الخاصة بالمجموعات ما زالت تسبب recursion.
              </p>
              <p className="mb-4 text-sm text-gray-600">
                شغّل ملف <span className="font-mono">fix-groups-rls.sql</span>{" "}
                في Supabase SQL Editor، ثم أعد تحميل الصفحة.
              </p>
              <button
                onClick={() => refetchGroups()}
                className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : groupsError ? (
            <p className="text-center text-red-600">خطأ في تحميل المجموعات</p>
          ) : groups && groups.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow">
              <BiBook className="mx-auto mb-4 text-6xl text-gray-300" />
              <p className="text-lg text-gray-600">لا توجد مجموعات حالياً</p>
              <p className="text-gray-500">
                انقر على الزر أعلاه لإنشاء مجموعة جديدة
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {groups?.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate(`/teacher/group/${group.id}`)}
                  className="cursor-pointer overflow-hidden rounded-xl bg-white shadow transition hover:scale-105 hover:shadow-lg"
                >
                  <div className="space-y-4 p-6">
                    <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                      <p className="text-xs uppercase tracking-widest text-white/80">
                        كود المجموعة
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="break-all font-mono text-xl font-bold leading-tight md:text-2xl">
                          {group.group_code}
                        </p>
                        <button
                          type="button"
                          onClick={(event) =>
                            handleCopyGroupCode(event, group.group_code)
                          }
                          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
                          title="نسخ الكود"
                        >
                          <BiCopy className="text-base" />
                          نسخ
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="mb-1 text-sm text-gray-500">
                          اسم المجموعة
                        </p>
                        <h3 className="break-words text-xl font-bold text-gray-800">
                          {group.name}
                        </h3>
                        <p className="mt-1 break-words text-sm text-gray-600">
                          {group.subject}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                          group.type === "group"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {group.type === "group" ? "مجموعة" : "حصة خصوصية"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {group.description || "لا توجد وصفة"}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">الطلاب</p>
                        <p className="font-bold text-gray-800">
                          {group.group_members_aggregate?.count || 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">الحصص/الأسبوع</p>
                        <p className="font-bold text-gray-800">
                          {group.group_schedule?.length || 0}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                      <p className="mb-1 text-xs text-gray-500">الجدول</p>
                      {group.group_schedule?.length ? (
                        <p>
                          {group.group_schedule
                            .map((item) =>
                              `${item.day_of_week} ${formatScheduleRange(item.start_time, item.end_time)}`.trim(),
                            )
                            .join(" • ")}
                        </p>
                      ) : (
                        <p>لم يتم تحديد جدول بعد</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(event) => handleDeleteGroup(event, group)}
                      disabled={deleteGroupMutation.isPending}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <BiTrash className="text-base" />
                      إلغاء هذه المجموعة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal ? (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetchGroups();
          }}
        />
      ) : null}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.type === "logout" ? "تسجيل الخروج" : "إلغاء المجموعة"
        }
        message={
          confirmModal.type === "logout"
            ? "هل أنت متأكد من رغبتك في تسجيل الخروج؟"
            : `هل تريد إلغاء هذه المجموعة؟\n\n${confirmModal.groupName || ""}`
        }
        confirmText="تأكيد"
        cancelText="إلغاء"
        isDangerous={confirmModal.type === "deleteGroup"}
        onConfirm={handleConfirmAction}
        onCancel={() =>
          setConfirmModal({
            isOpen: false,
            type: null,
            groupId: null,
            groupName: null,
          })
        }
      />
    </div>
  );
}

export default TeacherDashboard;
