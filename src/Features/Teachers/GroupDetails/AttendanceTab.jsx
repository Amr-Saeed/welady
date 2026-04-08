import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { formatScheduleRange } from "./groupDetailsUtils";
import {
  getGroupAttendanceByDate,
  recordAttendance,
} from "../../../Services/apiGroups";
import { addInAppNotification } from "../../../Services/apiNotifications";

const AR_DAY_TO_INDEX = {
  الأحد: 0,
  الاثنين: 1,
  الثلاثاء: 2,
  الأربعاء: 3,
  الخميس: 4,
  الجمعة: 5,
  السبت: 6,
};

function nextDateForDayName(dayName) {
  const targetDay = AR_DAY_TO_INDEX[dayName];
  if (targetDay === undefined) {
    return new Date().toISOString().split("T")[0];
  }

  const now = new Date();
  const candidate = new Date(now);
  const currentDay = now.getDay();
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  candidate.setDate(now.getDate() + diff);

  const yyyy = candidate.getFullYear();
  const mm = String(candidate.getMonth() + 1).padStart(2, "0");
  const dd = String(candidate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isDateMatchingLessonDay(dateValue, lessonDayName) {
  if (!dateValue || !lessonDayName) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.getDay() === AR_DAY_TO_INDEX[lessonDayName];
}

function getStatusMeta(status) {
  if (status === "attending") {
    return { label: "حضر", color: "bg-green-100 text-green-700" };
  }
  if (status === "absent") {
    return { label: "غياب", color: "bg-red-100 text-red-700" };
  }
  if (status === "late") {
    return { label: "تأخر", color: "bg-yellow-100 text-yellow-700" };
  }
  return { label: "ألغيت الحصة", color: "bg-gray-100 text-gray-700" };
}

function AttendanceTab({ group, onRefresh }) {
  const lessonOptions = useMemo(() => {
    return (group.group_schedule || []).map((lesson) => ({
      key: lesson.id,
      day: lesson.day_of_week,
      startTime: lesson.start_time,
      endTime: lesson.end_time,
    }));
  }, [group.group_schedule]);

  const [selectedLessonKey, setSelectedLessonKey] = useState(
    lessonOptions[0]?.key || "",
  );

  const selectedLesson = useMemo(
    () => lessonOptions.find((lesson) => lesson.key === selectedLessonKey),
    [lessonOptions, selectedLessonKey],
  );

  const [selectedDate, setSelectedDate] = useState(
    nextDateForDayName(lessonOptions[0]?.day),
  );
  const [attendanceRecords, setAttendanceRecords] = useState({});

  useEffect(() => {
    setAttendanceRecords({});
  }, [selectedDate, selectedLessonKey]);

  const {
    data: existingRecords = [],
    isLoading: loadingExistingAttendance,
    refetch: refetchExistingAttendance,
  } = useQuery({
    queryKey: ["groupAttendanceByDate", group.id, selectedDate],
    queryFn: () => getGroupAttendanceByDate(group.id, selectedDate),
    enabled: Boolean(group.id && selectedDate),
  });

  const existingByChildId = useMemo(() => {
    return (existingRecords || []).reduce((accumulator, record) => {
      accumulator[record.childID] = record;
      return accumulator;
    }, {});
  }, [existingRecords]);

  const handleAttendanceChange = (childId, status) => {
    if (existingByChildId[childId]) return;

    setAttendanceRecords((previous) => ({
      ...previous,
      [childId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedLesson) {
      toast.error("يرجى اختيار الحصة أولاً");
      return;
    }

    if (!selectedDate) {
      toast.error("يرجى اختيار التاريخ");
      return;
    }

    if (!isDateMatchingLessonDay(selectedDate, selectedLesson.day)) {
      toast.error("التاريخ لا يطابق يوم الحصة المختار");
      return;
    }

    try {
      for (const [childId, status] of Object.entries(attendanceRecords)) {
        if (status && !existingByChildId[childId]) {
          await recordAttendance(group.id, childId, selectedDate, status);

          addInAppNotification({
            childId,
            type: "attendance_decision",
            title: "تأكيد حالة الحضور",
            message: "يمكنكِ تأكيد أو تعديل حالة حضور الطفل لهذا اليوم.",
            dedupeKey: `attendance-decision-${group.id}-${childId}-${selectedDate}`,
            payload: {
              groupId: group.id,
              lessonDate: selectedDate,
              proposedStatus: status,
              resolved: false,
            },
          });
        }
      }
      toast.success("تم حفظ الحضور بنجاح!");
      setAttendanceRecords({});
      await refetchExistingAttendance();
      onRefresh();
    } catch (error) {
      toast.error("خطأ في حفظ الحضور");
      console.error(error);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-bold text-gray-800">تسجيل الحضور</h2>

      <div className="mb-4">
        <label className="mb-2 block font-semibold text-gray-700">
          اختر الحصة من الجدول
        </label>
        <select
          value={selectedLessonKey}
          onChange={(event) => {
            const nextKey = event.target.value;
            setSelectedLessonKey(nextKey);
            const nextLesson = lessonOptions.find(
              (lesson) => lesson.key === nextKey,
            );
            setSelectedDate(nextDateForDayName(nextLesson?.day));
            setAttendanceRecords({});
          }}
          className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
        >
          {lessonOptions.map((lesson) => (
            <option key={lesson.key} value={lesson.key}>
              {lesson.day}
              {formatScheduleRange(lesson.startTime, lesson.endTime)
                ? ` - ${formatScheduleRange(lesson.startTime, lesson.endTime)}`
                : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="mb-2 block font-semibold text-gray-700">
          اختر التاريخ
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => {
            setSelectedDate(event.target.value);
            setAttendanceRecords({});
          }}
          className="rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          يجب أن يكون التاريخ بنفس يوم الحصة المختار (
          {selectedLesson?.day || "-"})
        </p>
      </div>

      {group.group_members && group.group_members.length > 0 ? (
        <>
          {loadingExistingAttendance ? (
            <p className="mb-4 text-sm text-gray-500">
              جاري تحميل حالة اليوم...
            </p>
          ) : null}

          <div className="mb-6 space-y-4">
            {group.group_members.map((member) => {
              const childId = member.child_id || member.childID;
              const savedRecord = existingByChildId[childId];
              const isLocked = Boolean(savedRecord);
              const activeStatus =
                savedRecord?.status || attendanceRecords[childId] || null;
              const isChosen = Boolean(attendanceRecords[childId]);
              const hideButtons = isLocked || isChosen;
              const statusMeta = activeStatus
                ? getStatusMeta(activeStatus)
                : null;

              return (
                <div
                  key={member.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <h3 className="mb-3 font-semibold text-gray-800">
                    {member.children?.name}
                  </h3>

                  {isLocked ? (
                    <p className="mb-2 text-xs text-green-700">
                      تم تسجيل الحالة بالفعل ولا يمكن تعديلها
                    </p>
                  ) : null}

                  {isChosen && !isLocked ? (
                    <p className="mb-2 text-xs text-blue-700">
                      تم اختيار الحالة. اضغط حفظ الحضور لتثبيتها.
                    </p>
                  ) : null}

                  {hideButtons && statusMeta ? (
                    <div className="flex">
                      <span
                        className={`inline-flex rounded-lg px-4 py-2 text-sm font-semibold ${statusMeta.color}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {[
                        {
                          value: "attending",
                          label: "حضر",
                          color: "bg-green-100 text-green-700",
                        },
                        {
                          value: "absent",
                          label: "غياب",
                          color: "bg-red-100 text-red-700",
                        },
                        {
                          value: "late",
                          label: "تأخر",
                          color: "bg-yellow-100 text-yellow-700",
                        },
                      ].map((status) => (
                        <button
                          key={status.value}
                          onClick={() =>
                            handleAttendanceChange(childId, status.value)
                          }
                          className="flex-1 rounded-lg bg-gray-50 py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSaveAttendance}
            disabled={
              Object.values(attendanceRecords).filter(Boolean).length === 0
            }
            className="w-full rounded-lg bg-purple-600 px-6 py-3 font-bold text-white transition hover:bg-purple-700 disabled:bg-gray-400"
          >
            حفظ الحضور
          </button>
        </>
      ) : (
        <p className="py-8 text-center text-gray-500">
          لا يوجد طلاب لتسجيل حضورهم
        </p>
      )}
    </div>
  );
}

export default AttendanceTab;
