import { useNavigate, useParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { BiArrowBack } from "react-icons/bi";
import {
  getPrivateLessonChildAttendanceAnalytics,
  getPrivateLessonChildHomeworkAnalytics,
  usePrivateLesson,
} from "../Services/apiTeacherChildren";

function homeworkStatusLabel(status) {
  if (status === "done") return "تم";
  if (status === "not_done") return "لم يتم";
  return "انتظار";
}

function homeworkStatusClass(status) {
  if (status === "done") return "bg-green-100 text-green-700";
  if (status === "not_done") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function attendanceLabel(status) {
  if (status === "teacher_canceled") return "المستر الغي";
  if (status === "child_canceled") return "الطفل الغي";
  return "غير محدد";
}

function attendanceClass(status) {
  if (status === "teacher_canceled") return "bg-amber-100 text-amber-700";
  if (status === "child_canceled") return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function TeacherPrivateStudentAnalytics() {
  const { lessonId, childId } = useParams();
  const navigate = useNavigate();

  const {
    data: lesson,
    isLoading: lessonLoading,
    error: lessonError,
  } = usePrivateLesson(lessonId);

  const [homeworkQuery, attendanceQuery] = useQueries({
    queries: [
      {
        queryKey: ["privateStudentHomeworkAnalytics", lessonId, childId],
        queryFn: () =>
          getPrivateLessonChildHomeworkAnalytics(lessonId, childId),
        enabled: Boolean(lessonId && childId),
      },
      {
        queryKey: ["privateStudentAttendanceAnalytics", lessonId, childId],
        queryFn: () =>
          getPrivateLessonChildAttendanceAnalytics(lessonId, childId),
        enabled: Boolean(lessonId && childId),
      },
    ],
  });

  if (lessonLoading || homeworkQuery.isLoading || attendanceQuery.isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        dir="rtl"
      >
        <p className="text-lg text-gray-700">جاري تحميل التحليلات...</p>
      </div>
    );
  }

  if (lessonError || homeworkQuery.error || attendanceQuery.error || !lesson) {
    return (
      <div className="p-6" dir="rtl">
        <button
          onClick={() => navigate("/teacher/lessons")}
          className="mb-4 flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
        >
          <BiArrowBack className="text-xl" />
          العودة
        </button>
        <p className="text-red-600">تعذر تحميل صفحة تحليلات الطالب</p>
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
          onClick={() => navigate("/teacher/lessons")}
          className="flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
        >
          <BiArrowBack className="text-xl" />
          العودة إلى الدروس الخصوصية
        </button>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">تحليلات الطالب</h1>
          <p className="mt-1 text-gray-700">
            {lesson.children?.name || "طالب"}
          </p>
          <p className="text-sm text-gray-500">
            الدرس الخصوصي: {lesson.subject || "بدون مادة"}
          </p>
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
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-gray-500">المستر الغي</p>
                <p className="text-xl font-bold text-amber-700">
                  {attendanceData.summary.teacher_canceled || 0}
                </p>
              </div>
              <div className="rounded-lg bg-rose-50 p-3">
                <p className="text-gray-500">الطفل الغي</p>
                <p className="text-xl font-bold text-rose-700">
                  {attendanceData.summary.child_canceled || 0}
                </p>
              </div>
            </div>
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
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${homeworkStatusClass(item.status)}`}
                    >
                      {homeworkStatusLabel(item.status)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-sm text-gray-600">
                      {item.description}
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
                  key={record.lessonId || record.updatedAt}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm"
                >
                  <p className="font-semibold text-gray-800">
                    {record.updatedAt
                      ? new Date(record.updatedAt).toLocaleString("ar-EG")
                      : "بدون تاريخ"}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${attendanceClass(record.status)}`}
                  >
                    {attendanceLabel(record.status)}
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
