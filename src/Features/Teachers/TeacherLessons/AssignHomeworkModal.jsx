import { useState } from "react";
import toast from "react-hot-toast";
import { addInAppNotification } from "../../../Services/apiNotifications";
import { formatToArabic12Hour } from "../../../Utils/helper";

function AssignHomeworkModal({
  lesson,
  assignHomeworkMutation,
  onClose,
  onSuccess,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الواجب");
      return;
    }

    try {
      await assignHomeworkMutation.mutateAsync({
        lessonId: lesson.id,
        childId: lesson.childID,
        title,
        description,
        dueDate: dueDate || null,
      });

      addInAppNotification({
        childId: lesson.childID,
        type: "homework_new",
        title: "واجب جديد",
        message: `تمت إضافة واجب جديد: ${title.trim()}`,
        dedupeKey: `private-homework-new-${lesson.id}-${lesson.childID}-${title.trim()}-${dueDate || "no-date"}`,
        payload: {
          lessonId: lesson.id,
          childId: lesson.childID,
          title: title.trim(),
          dueDate: dueDate || null,
        },
      });

      toast.success("تم إسناد الواجب بنجاح!");
      onSuccess();
    } catch (error) {
      toast.error("خطأ في إسناد الواجب");
      console.error(error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">إضافة واجب</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-gray-600">للطالب:</p>
            <p className="text-lg font-bold text-gray-800">
              {lesson.children?.name}
            </p>
            <p className="text-sm text-gray-600">
              {lesson.subject} - {formatToArabic12Hour(lesson.lessonTime)}
            </p>
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              عنوان الواجب *
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: حل تمارين الفصل 5"
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={assignHomeworkMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              الوصفة / التفاصيل
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="تفاصيل الواجب..."
              rows="3"
              className="w-full resize-none rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={assignHomeworkMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              موعد التسليم
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={assignHomeworkMutation.isPending}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={assignHomeworkMutation.isPending}
              className="flex-1 rounded-lg bg-purple-600 py-2 font-bold text-white hover:bg-purple-700 disabled:bg-gray-400"
            >
              {assignHomeworkMutation.isPending ? "جاري..." : "إضافة"}
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

export default AssignHomeworkModal;
