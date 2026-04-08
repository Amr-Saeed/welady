import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  addGroupSchedule,
  updateGroupSchedule,
} from "../../../Services/apiGroups";

function AddScheduleModal({
  groupId,
  dayNames,
  onClose,
  onSuccess,
  scheduleToEdit = null,
}) {
  const [dayOfWeek, setDayOfWeek] = useState(
    scheduleToEdit?.day_of_week || dayNames?.[0] || "",
  );
  const [startTime, setStartTime] = useState(
    scheduleToEdit?.start_time || "10:00",
  );
  const [endTime, setEndTime] = useState(scheduleToEdit?.end_time || "11:00");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setDayOfWeek(scheduleToEdit?.day_of_week || dayNames?.[0] || "");
    setStartTime(scheduleToEdit?.start_time || "10:00");
    setEndTime(scheduleToEdit?.end_time || "11:00");
  }, [dayNames, scheduleToEdit]);

  const isValidTimeRange = () => {
    if (!startTime || !endTime) {
      return false;
    }

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    return endHours * 60 + endMinutes > startHours * 60 + startMinutes;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!dayOfWeek || !startTime || !endTime) {
      toast.error("يرجى استكمال بيانات الحصة");
      return;
    }

    if (!isValidTimeRange()) {
      toast.error("وقت النهاية يجب أن يكون بعد وقت البداية");
      return;
    }

    setIsLoading(true);

    try {
      const isEdit = Boolean(scheduleToEdit?.id);

      if (isEdit) {
        await updateGroupSchedule(
          scheduleToEdit.id,
          dayOfWeek,
          startTime,
          endTime,
        );
        toast.success("تم تعديل الحصة بنجاح!");
      } else {
        await addGroupSchedule(groupId, dayOfWeek, startTime, endTime);
        toast.success("تم إضافة الحصة بنجاح!");
      }
      onSuccess?.({
        action: isEdit ? "updated" : "added",
        scheduleId: scheduleToEdit?.id || null,
        dayOfWeek,
        startTime,
        endTime,
      });
    } catch (error) {
      toast.error(
        scheduleToEdit?.id ? "خطأ في تعديل الحصة" : "خطأ في إضافة الحصة",
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          {scheduleToEdit?.id ? "تعديل الحصة" : "إضافة حصة"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              اليوم
            </label>
            <select
              value={dayOfWeek}
              onChange={(event) => setDayOfWeek(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
            >
              {dayNames.map((day, index) => (
                <option key={index} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              وقت البداية
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              وقت النهاية
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-purple-600 py-2 font-bold text-white hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isLoading
                ? "جاري..."
                : scheduleToEdit?.id
                  ? "حفظ التعديل"
                  : "إضافة"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border-2 border-gray-300 py-2 font-bold text-gray-700"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddScheduleModal;
