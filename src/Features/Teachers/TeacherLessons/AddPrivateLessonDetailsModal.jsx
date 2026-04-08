import { useState } from "react";
import toast from "react-hot-toast";
import { addInAppNotification } from "../../../Services/apiNotifications";
import { formatToArabic12Hour } from "../../../Utils/helper";

const DAY_NAMES = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function AddPrivateLessonDetailsModal({
  child,
  createPrivateLessonMutation,
  onClose,
  onSuccess,
}) {
  const [subject, setSubject] = useState("");
  const [lessonDay, setLessonDay] = useState(DAY_NAMES[0]);
  const [lessonTime, setLessonTime] = useState("16:00");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");

  const isPending = createPrivateLessonMutation.isPending;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!subject.trim() || !lessonDay || !lessonTime || !price) {
      toast.error("يرجى استكمال بيانات الحصة");
      return;
    }

    try {
      await createPrivateLessonMutation.mutateAsync({
        childId: child.id,
        subject: subject.trim(),
        grade: child.grade || "",
        lessonDay,
        lessonTime,
        location: location.trim() || "غير محدد",
        price: Number(price),
      });

      addInAppNotification({
        childId: child.id,
        type: "lesson_added",
        title: "إضافة حصة جديدة",
        message: `تمت إضافة حصة ${subject.trim()} يوم ${lessonDay} الساعة ${formatToArabic12Hour(lessonTime)}`,
        dedupeKey: `private-lesson-added-${child.id}-${subject.trim()}-${lessonDay}-${lessonTime}`,
        payload: {
          childId: child.id,
          subject: subject.trim(),
          lessonDay,
          lessonTime,
        },
      });

      toast.success("تم حفظ الحصة بنجاح");
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || "تعذر حفظ الحصة");
      console.error(error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-xl font-bold text-gray-800">بيانات الحصة</h3>
        <p className="mb-4 text-sm text-gray-600">
          الطالب: <span className="font-semibold">{child.name}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              المادة
            </label>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              يوم الحصة
            </label>
            <select
              value={lessonDay}
              onChange={(event) => setLessonDay(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isPending}
            >
              {DAY_NAMES.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              وقت الحصة
            </label>
            <input
              type="time"
              value={lessonTime}
              onChange={(event) => setLessonTime(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              المكان
            </label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isPending}
              placeholder="غير محدد"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              السعر
            </label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isPending}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-purple-600 py-2 font-bold text-white hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isPending ? "جاري الحفظ..." : "حفظ الحصة"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-gray-300 py-2 font-bold text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPrivateLessonDetailsModal;
