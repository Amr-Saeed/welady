import { useState } from "react";
import toast from "react-hot-toast";
import { addHomework } from "../../../Services/apiGroups";
import { addInAppNotification } from "../../../Services/apiNotifications";

function AddHomeworkModal({ groupId, groupMembers, onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [childId, setChildId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الواجب");
      return;
    }

    setIsLoading(true);
    try {
      const createdHomework = await addHomework(
        groupId,
        title,
        description,
        dueDate || null,
        childId || null,
      );

      const targetChildIds = childId
        ? [childId]
        : (groupMembers || [])
            .map((member) => member.child_id || member.childID)
            .filter(Boolean);

      const createdRows = Array.isArray(createdHomework)
        ? createdHomework
        : createdHomework
          ? [createdHomework]
          : [];

      targetChildIds.forEach((targetChildId) => {
        const matchingRow = createdRows.find(
          (row) => (row.childID || row.child_id) === targetChildId,
        );
        const fallbackToken = `${Date.now()}-${targetChildId}`;

        addInAppNotification({
          childId: targetChildId,
          type: "homework_new",
          title: "واجب جديد",
          message: `تمت إضافة واجب جديد: ${title.trim()}`,
          dedupeKey: `homework-new-${groupId}-${matchingRow?.id || fallbackToken}-${targetChildId}`,
        });
      });

      toast.success("تم إضافة الواجب بنجاح!");
      onSuccess();
    } catch (error) {
      toast.error("خطأ في إضافة الواجب");
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
        <h2 className="mb-6 text-2xl font-bold text-gray-800">إضافة واجب</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              عنوان الواجب *
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              الوصفة
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-none rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              rows="3"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              موعد التسليم
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              هل الواجب لطالب محدد؟
            </label>
            <select
              value={childId}
              onChange={(event) => setChildId(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            >
              <option value="">للمجموعة كاملة</option>
              {groupMembers?.map((member) => (
                <option
                  key={member.child_id || member.childID}
                  value={member.child_id || member.childID}
                >
                  {member.children?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-purple-600 py-2 font-bold text-white hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isLoading ? "جاري..." : "إضافة"}
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

export default AddHomeworkModal;
