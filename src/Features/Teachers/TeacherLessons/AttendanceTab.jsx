function attendanceLabel(status) {
  if (status === "teacher_canceled") return "تم: المستر الغي";
  if (status === "child_canceled") return "تم: الطفل الغي";
  return "لم يتم تحديد الحالة";
}

function attendanceClass(status) {
  if (status === "teacher_canceled") return "bg-amber-100 text-amber-700";
  if (status === "child_canceled") return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-gray-600";
}

function AttendanceTab({
  children,
  childrenLoading,
  attendanceStatusByLesson,
  onSetAttendanceStatus,
}) {
  if (childrenLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow">
        <p className="text-center text-gray-600">جاري تحميل الحضور...</p>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow">
        <p className="text-lg text-gray-600">لا يوجد طلاب حالياً</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-2xl font-bold text-gray-800">الحضور</h2>

      <div className="space-y-4">
        {children.map((lesson) => {
          const attendanceStatus =
            attendanceStatusByLesson?.[lesson.id] || null;
          const isLocked = Boolean(attendanceStatus);

          return (
            <div
              key={lesson.id}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {lesson.children?.name}
                  </h3>
                  <p className="text-sm text-gray-600">{lesson.subject}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${attendanceClass(
                    attendanceStatus,
                  )}`}
                >
                  {attendanceLabel(attendanceStatus)}
                </span>
              </div>

              {isLocked ? (
                <div className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-blue-700">
                  تم تسجيل الحالة
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() =>
                      onSetAttendanceStatus?.(lesson, "teacher_canceled")
                    }
                    className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-200"
                  >
                    المستر الغي
                  </button>
                  <button
                    onClick={() =>
                      onSetAttendanceStatus?.(lesson, "child_canceled")
                    }
                    className="rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-200"
                  >
                    الطفل الغي
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AttendanceTab;
