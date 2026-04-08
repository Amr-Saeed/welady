import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BiArrowBack } from "react-icons/bi";
import {
  getChildAttendanceAnalytics,
  getChildHomeworkAnalytics,
  getGroupById,
} from "../Services/apiGroups";

function percent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export default function TeacherStudentAnalytics() {
  const { groupId, childId } = useParams();
  const navigate = useNavigate();

  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
  } = useQuery({
    queryKey: ["groupDetails", groupId],
    queryFn: () => getGroupById(groupId),
    retry: 1,
  });

  const [homeworkQuery, attendanceQuery] = useQueries({
    queries: [
      {
        queryKey: ["studentHomeworkAnalytics", groupId, childId],
        queryFn: () => getChildHomeworkAnalytics(groupId, childId),
        enabled: Boolean(groupId && childId),
        staleTime: 0,
        refetchOnMount: "always",
      },
      {
        queryKey: ["studentAttendanceAnalytics", groupId, childId],
        queryFn: () => getChildAttendanceAnalytics(groupId, childId),
        enabled: Boolean(groupId && childId),
        staleTime: 0,
        refetchOnMount: "always",
      },
    ],
  });

  const child = useMemo(() => {
    return (group?.group_members || []).find((member) => {
      const id = member.child_id || member.childID;
      return id === childId;
    });
  }, [group, childId]);

  if (groupLoading || homeworkQuery.isLoading || attendanceQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-lg text-gray-700">جاري تحميل التحليلات...</p>
      </div>
    );
  }

  if (groupError || homeworkQuery.error || attendanceQuery.error || !group) {
    return (
      <div className="p-6" dir="rtl">
        <button
          onClick={() => navigate(`/teacher/group/${groupId}`)}
          className="mb-4 flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
        >
          <BiArrowBack className="text-xl" />
          العودة
        </button>
        <p className="text-red-600">تعذر تحميل صفحة التحليلات</p>
      </div>
    );
  }

  const homeworkData = homeworkQuery.data || { summary: {}, items: [] };
  const attendanceData = attendanceQuery.data || { summary: {}, items: [] };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          onClick={() => navigate(`/teacher/group/${groupId}`)}
          className="flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
        >
          <BiArrowBack className="text-xl" />
          العودة إلى المجموعة
        </button>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">تحليلات الطالب</h1>
          <p className="mt-1 text-gray-600">
            {child?.children?.name || "طالب"}
          </p>
          <p className="text-sm text-gray-500">المجموعة: {group.name}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-bold text-gray-800">
              أداء الواجبات
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">الإجمالي</p>
                <p className="text-xl font-bold text-gray-800">
                  {homeworkData.summary.total || 0}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-gray-500">تم</p>
                <p className="text-xl font-bold text-green-700">
                  {homeworkData.summary.done || 0}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-gray-500">لم يتم</p>
                <p className="text-xl font-bold text-red-700">
                  {homeworkData.summary.not_done || 0}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-gray-500">انتظار</p>
                <p className="text-xl font-bold text-amber-700">
                  {homeworkData.summary.pending || 0}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              نسبة الإنجاز:{" "}
              {percent(
                homeworkData.summary.done || 0,
                homeworkData.summary.total || 0,
              )}
              %
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-bold text-gray-800">
              أداء الحضور
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">الإجمالي</p>
                <p className="text-xl font-bold text-gray-800">
                  {attendanceData.summary.total || 0}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-gray-500">حاضر</p>
                <p className="text-xl font-bold text-green-700">
                  {attendanceData.summary.attending || 0}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-gray-500">غائب</p>
                <p className="text-xl font-bold text-red-700">
                  {attendanceData.summary.absent || 0}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-gray-500">متأخر</p>
                <p className="text-xl font-bold text-orange-700">
                  {attendanceData.summary.late || 0}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              نسبة الحضور:{" "}
              {percent(
                attendanceData.summary.attending || 0,
                attendanceData.summary.total || 0,
              )}
              %
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-bold text-gray-800">
            تفاصيل الواجبات
          </h2>
          <div className="space-y-3">
            {(homeworkData.items || []).length === 0 ? (
              <p className="text-sm text-gray-500">
                لا توجد واجبات لهذا الطالب حتى الآن
              </p>
            ) : (
              homeworkData.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-800">{item.title}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.status === "done"
                          ? "bg-green-100 text-green-700"
                          : item.status === "not_done"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.status === "done"
                        ? "تم"
                        : item.status === "not_done"
                          ? "لم يتم"
                          : "انتظار"}
                    </span>
                  </div>
                  {item.due_date ? (
                    <p className="mt-1 text-xs text-gray-500">
                      موعد التسليم:{" "}
                      {new Date(item.due_date).toLocaleDateString("ar-EG")}
                    </p>
                  ) : null}
                  {item.status === "done" &&
                  (item.submitted_at || item.updated_at) ? (
                    <p className="mt-1 text-xs text-green-700">
                      تم التنفيذ في:{" "}
                      {new Date(
                        item.submitted_at || item.updated_at,
                      ).toLocaleString("ar-EG")}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-bold text-gray-800">سجل الحضور</h2>
          <div className="space-y-2">
            {(attendanceData.items || []).length === 0 ? (
              <p className="text-sm text-gray-500">
                لا توجد سجلات حضور حتى الآن
              </p>
            ) : (
              attendanceData.items.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm"
                >
                  <p className="font-semibold text-gray-800">
                    {new Date(record.lessonDate).toLocaleDateString("ar-EG")}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${
                      record.status === "attending"
                        ? "bg-green-100 text-green-700"
                        : record.status === "absent"
                          ? "bg-red-100 text-red-700"
                          : record.status === "late"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {record.status === "attending"
                      ? "حاضر"
                      : record.status === "absent"
                        ? "غائب"
                        : record.status === "late"
                          ? "متأخر"
                          : "ملغاة"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
