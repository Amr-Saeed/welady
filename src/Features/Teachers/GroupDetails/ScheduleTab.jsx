import { useState } from "react";
import { BiPlus } from "react-icons/bi";
import { BiEdit } from "react-icons/bi";
import {
  formatDayName,
  formatScheduleRange,
  DAY_NAMES,
} from "./groupDetailsUtils";
import AddScheduleModal from "./AddScheduleModal";
import toast from "react-hot-toast";
import { recordAttendance } from "../../../Services/apiGroups";
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

function ScheduleTab({ group, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState(null);
  const [cancelLessonTarget, setCancelLessonTarget] = useState(null);
  const [cancelDate, setCancelDate] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);

  const notifyParentsAboutScheduleChange = (action, schedulePayload) => {
    const members = group.group_members || [];
    const dayName = formatDayName(schedulePayload.dayOfWeek);
    const scheduleRange = formatScheduleRange(
      schedulePayload.startTime,
      schedulePayload.endTime,
    );
    const scheduleLabel = scheduleRange
      ? `${dayName} - ${scheduleRange}`
      : dayName;
    const type = action === "updated" ? "schedule_updated" : "schedule_added";
    const title = action === "updated" ? "تعديل جدول الحصص" : "إضافة حصة جديدة";
    const message =
      action === "updated"
        ? `تم تعديل جدول المجموعة: ${scheduleLabel}`
        : `تمت إضافة حصة جديدة إلى الجدول: ${scheduleLabel}`;

    members.forEach((member) => {
      const childId = member.child_id || member.childID;
      if (!childId) return;

      addInAppNotification({
        childId,
        type,
        title,
        message,
        dedupeKey: `${type}-${group.id}-${childId}-${schedulePayload.scheduleId || schedulePayload.dayOfWeek}-${schedulePayload.startTime || ""}-${schedulePayload.endTime || ""}`,
        payload: {
          groupId: group.id,
          scheduleId: schedulePayload.scheduleId || null,
          dayName,
          startTime: schedulePayload.startTime,
          endTime: schedulePayload.endTime,
          action,
        },
      });
    });
  };

  const openEditModal = (schedule) => {
    setShowAddModal(false);
    setScheduleToEdit(schedule);
  };

  const handleStartCancelLesson = (schedule) => {
    const dayName = formatDayName(schedule.day_of_week);
    setCancelLessonTarget({ ...schedule, dayName });
    setCancelDate(nextDateForDayName(dayName));
  };

  const handleConfirmCancelLesson = async () => {
    if (!cancelLessonTarget || !cancelDate) {
      toast.error("يرجى اختيار تاريخ الحصة");
      return;
    }

    const members = group.group_members || [];
    if (members.length === 0) {
      toast.error("لا يوجد طلاب في المجموعة");
      return;
    }

    try {
      setIsCanceling(true);

      for (const member of members) {
        const childId = member.child_id || member.childID;
        await recordAttendance(
          group.id,
          childId,
          cancelDate,
          "canceled",
          "تم إلغاء الحصة من الجدول",
          "teacher",
        );

        addInAppNotification({
          childId,
          type: "lesson_canceled",
          title: "إلغاء حصة",
          message: `تم إلغاء حصة ${group.subject || "المادة"} بتاريخ ${cancelDate}`,
          dedupeKey: `lesson-canceled-${group.id}-${childId}-${cancelDate}`,
          payload: {
            groupId: group.id,
            lessonDate: cancelDate,
            dayName: cancelLessonTarget.dayName,
          },
        });
      }

      toast.success("تم إلغاء الحصة وإرسال إشعار للأهالي");
      setCancelLessonTarget(null);
      setCancelDate("");
      onRefresh?.();
    } catch (error) {
      console.error(error);
      toast.error("تعذر إلغاء الحصة");
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <>
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">جدول الحصص</h2>
          <button
            onClick={() => {
              setScheduleToEdit(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700"
          >
            <BiPlus className="text-xl" />
            إضافة حصة
          </button>
        </div>

        {group.group_schedule && group.group_schedule.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {group.group_schedule.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-lg border border-purple-200 bg-purple-50 p-4"
              >
                <p className="text-lg font-bold text-gray-800">
                  {formatDayName(schedule.day_of_week)}
                </p>
                <p className="mt-2 text-xl text-purple-600">
                  {formatScheduleRange(schedule.start_time, schedule.end_time)}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEditModal(schedule)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <BiEdit className="text-base" />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleStartCancelLesson(schedule)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    إلغاء الحصة
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <p>لم يتم تحديد جدول حصص بعد</p>
            <p className="text-sm">انقر على الزر أعلاه لإضافة حصة</p>
          </div>
        )}
      </div>

      {showAddModal || scheduleToEdit ? (
        <AddScheduleModal
          groupId={group.id}
          dayNames={DAY_NAMES}
          scheduleToEdit={scheduleToEdit}
          onClose={() => {
            setShowAddModal(false);
            setScheduleToEdit(null);
          }}
          onSuccess={(payload) => {
            if (payload) {
              notifyParentsAboutScheduleChange(payload.action, payload);
            }
            setShowAddModal(false);
            setScheduleToEdit(null);
            onRefresh();
          }}
        />
      ) : null}

      {cancelLessonTarget ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          dir="rtl"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
            <h3 className="mb-3 text-lg font-bold text-gray-800">إلغاء حصة</h3>
            <p className="mb-3 text-sm text-gray-600">
              سيتم تسجيل الحصة كـ (ملغاة) لكل طلاب المجموعة في اليوم المختار.
            </p>

            <label className="mb-2 block text-sm font-semibold text-gray-700">
              تاريخ الحصة الملغاة ({cancelLessonTarget.dayName})
            </label>
            <input
              type="date"
              value={cancelDate}
              onChange={(event) => setCancelDate(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isCanceling}
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleConfirmCancelLesson}
                disabled={isCanceling}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isCanceling ? "جاري..." : "تأكيد الإلغاء"}
              </button>
              <button
                onClick={() => {
                  if (isCanceling) return;
                  setCancelLessonTarget(null);
                  setCancelDate("");
                }}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ScheduleTab;
