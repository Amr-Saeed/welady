import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronForward } from "react-icons/io5";
import {
  BsBarChart,
  BsCalendarCheck,
  BsClock,
  BsPersonX,
  BsXCircle,
} from "react-icons/bs";
import { useChildById } from "../Features/Parents/useChildInfo";
import {
  useChildAttendanceRecords,
} from "../Features/Parents/useAttendance";

function ChildAttendanceSummary() {
  const navigate = useNavigate();
  const { childId } = useParams();

  const { data: child, isLoading, error } = useChildById(childId);
  const { data: attendanceRecords = [] } = useChildAttendanceRecords(childId);

  const summary = useMemo(() => {
    return attendanceRecords.reduce(
      (accumulator, record) => {
        accumulator.total += 1;
        if (record.status === "attended") accumulator.attended += 1;
        if (record.status === "child_absent") accumulator.childAbsent += 1;
        if (record.status === "child_late") accumulator.childLate += 1;
        if (record.status === "teacher_canceled") accumulator.teacherCanceled += 1;
        return accumulator;
      },
      { total: 0, attended: 0, childAbsent: 0, childLate: 0, teacherCanceled: 0 },
    );
  }, [attendanceRecords]);

  const records = useMemo(() => attendanceRecords, [attendanceRecords]);
  const bySubject = useMemo(() => {
    const map = new Map();

    attendanceRecords.forEach((record) => {
      const subject = record.lesson?.subject || record.subject || "بدون مادة";
      const existing = map.get(subject) || {
        subject,
        total: 0,
        attended: 0,
        childAbsent: 0,
        childLate: 0,
        teacherCanceled: 0,
      };

      existing.total += 1;
      if (record.status === "attended") existing.attended += 1;
      if (record.status === "child_absent") existing.childAbsent += 1;
      if (record.status === "child_late") existing.childLate += 1;
      if (record.status === "teacher_canceled") existing.teacherCanceled += 1;

      map.set(subject, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [attendanceRecords]);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const statusLabel = (status) => {
    if (status === "attended") return "الطفل حضر";
    if (status === "child_absent") return "الطفل لم يحضر";
    if (status === "child_late") return "الطفل تأخر";
    return "المدرس الغي الدرس";
  };

  const statusClass = (status) => {
    if (status === "attended") return "bg-emerald-100 text-emerald-700";
    if (status === "child_absent") return "bg-red-100 text-red-700";
    if (status === "child_late") return "bg-orange-100 text-orange-700";
    return "bg-amber-100 text-amber-700";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        جاري التحميل...
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        حدث خطأ في تحميل ملخص الحضور
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 pb-10 max-w-md mx-auto">
      <div className="bg-white border-b border-gray-200 px-4 py-4 relative">
        <button
          onClick={() => navigate(`/parent/child/${childId}`)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700"
        >
          <IoChevronForward className="text-2xl" />
        </button>
        <h1 className="text-2xl font-bold text-center text-gray-900">
          ملخص الحضور
        </h1>
        <p className="text-center text-sm text-gray-500 mt-1">{child.name}</p>
      </div>

      <div className="px-4 pt-5 space-y-5">
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsBarChart /> إجمالي الحالات
            </div>
            <div className="font-bold text-gray-900 text-xl">
              {summary.total}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsCalendarCheck /> الطفل حضر
            </div>
            <div className="font-bold text-emerald-600 text-xl">
              {summary.attended}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsPersonX /> الطفل لم يحضر
            </div>
            <div className="font-bold text-red-600 text-xl">
              {summary.childAbsent}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsClock /> الطفل تأخر
            </div>
            <div className="font-bold text-orange-600 text-xl">
              {summary.childLate}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsXCircle /> المدرس الغي الدرس
            </div>
            <div className="font-bold text-amber-600 text-xl">
              {summary.teacherCanceled}
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900">حسب المادة</h2>
          {bySubject.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
              لا توجد بيانات حضور حتى الآن.
            </div>
          )}

          {bySubject.map((item) => (
            <div
              key={item.subject}
              className="bg-white rounded-xl border border-gray-200 p-3 text-sm"
            >
              <div className="font-bold text-gray-900 mb-2">{item.subject}</div>
              <div className="grid grid-cols-2 gap-2 text-gray-700">
                <div>إجمالي: {item.total}</div>
                <div>حضر: {item.attended}</div>
                <div>لم يحضر: {item.childAbsent}</div>
                <div>تأخر: {item.childLate}</div>
                <div>المدرس الغى: {item.teacherCanceled}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900">آخر التحديثات</h2>
          {records.slice(0, 8).map((record) => (
            <div
              key={`${record.id}-${record.updated_at || record.updatedAt || record.marked_at || ""}`}
              className="bg-white rounded-xl border border-gray-200 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-gray-900 text-sm">
                  {record.lesson?.subject || "بدون مادة"}
                </div>
                <span
                  className={`text-xs  px-2 py-1 text-center rounded-full font-semibold ${statusClass(record.status)}`}
                >
                  {statusLabel(record.status)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                المدرس: {record.lesson?.teacherName || "غير محدد"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                تاريخ التحديث: {formatDate(record.updated_at || record.updatedAt || record.marked_at)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default ChildAttendanceSummary;
