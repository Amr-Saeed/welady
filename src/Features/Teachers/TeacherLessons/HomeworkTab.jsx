import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BiEdit, BiSave, BiTrash, BiX } from "react-icons/bi";
import {
  useDeleteHomework,
  useHomeworkStatuses,
  useUpdateHomework,
  useUpdateHomeworkStatus,
} from "../../../Services/apiTeacherChildren";
import { addInAppNotification } from "../../../Services/apiNotifications";

function statusLabel(status) {
  if (status === "done") return "تم";
  if (status === "not_done") return "لم يتم";
  return "قيد المتابعة";
}

function statusClass(status) {
  if (status === "done") return "bg-emerald-100 text-emerald-700";
  if (status === "not_done") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function HomeworkTab({ children, selectedLessonId, onClearLessonFilter }) {
  const deleteHomeworkMutation = useDeleteHomework();
  const updateHomeworkMutation = useUpdateHomework();
  const updateHomeworkStatusMutation = useUpdateHomeworkStatus();
  const [editingHomeworkId, setEditingHomeworkId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [localStatusByHomework, setLocalStatusByHomework] = useState({});

  const safeChildren = Array.isArray(children) ? children : [];

  const allHomework = safeChildren
    .filter((lesson) => !selectedLessonId || lesson.id === selectedLessonId)
    .flatMap((lesson) =>
      (lesson.homework || []).map((hw) => ({
        ...hw,
        lessonId: lesson.id,
        childId: lesson.childID,
        childName: lesson.children?.name,
        subject: lesson.subject,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );

  const homeworkIds = useMemo(
    () => allHomework.map((item) => item.id),
    [allHomework],
  );
  const { data: statusRows = [] } = useHomeworkStatuses(homeworkIds);

  const statusByHomeworkId = useMemo(
    () =>
      statusRows.reduce((accumulator, row) => {
        accumulator[row.homeworkID] = row;
        return accumulator;
      }, {}),
    [statusRows],
  );

  const openEdit = (homework) => {
    setEditingHomeworkId(homework.id);
    setEditTitle(homework.title || "");
    setEditDescription(homework.description || "");
    setEditDueDate(homework.dueDate || "");
  };

  const closeEdit = () => {
    setEditingHomeworkId(null);
    setEditTitle("");
    setEditDescription("");
    setEditDueDate("");
  };

  const saveEdit = async (homework) => {
    if (!editTitle.trim()) {
      toast.error("يرجى إدخال عنوان الواجب");
      return;
    }

    try {
      await updateHomeworkMutation.mutateAsync({
        id: homework.id,
        updates: {
          title: editTitle.trim(),
          description: editDescription.trim(),
          dueDate: editDueDate || null,
        },
      });

      addInAppNotification({
        childId: homework.childId,
        type: "homework_updated",
        title: "تعديل واجب",
        message: `تم تعديل واجب ${editTitle.trim()}`,
        dedupeKey: `homework-updated-${homework.id}-${editTitle.trim()}-${editDueDate || "no-date"}`,
        payload: {
          homeworkId: homework.id,
          childId: homework.childId,
          title: editTitle.trim(),
          dueDate: editDueDate || null,
        },
      });

      toast.success("تم تعديل الواجب");
      closeEdit();
    } catch (error) {
      toast.error(error.message || "تعذر تعديل الواجب");
    }
  };

  const changeStatus = async (homework, status) => {
    try {
      await updateHomeworkStatusMutation.mutateAsync({
        id: homework.id,
        status,
      });

      addInAppNotification({
        childId: homework.childId,
        type: "homework_status_updated",
        title: "تحديث حالة واجب",
        message: `تم تحديث حالة واجب ${homework.title} إلى ${statusLabel(
          status,
        )}`,
        dedupeKey: `homework-status-${homework.id}-${status}-${Date.now()}`,
        payload: {
          homeworkId: homework.id,
          childId: homework.childId,
          status,
        },
      });

      toast.success("تم تحديث حالة الواجب");
      setLocalStatusByHomework((previous) => ({
        ...previous,
        [homework.id]: status,
      }));
    } catch (error) {
      toast.error(error.message || "تعذر تحديث الحالة");
    }
  };

  const removeHomework = async (homework) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذا الواجب؟");
    if (!confirmed) return;

    try {
      await deleteHomeworkMutation.mutateAsync(homework.id);

      addInAppNotification({
        childId: homework.childId,
        type: "homework_deleted",
        title: "حذف واجب",
        message: `تم حذف واجب ${homework.title}`,
        dedupeKey: `homework-deleted-${homework.id}`,
        payload: {
          homeworkId: homework.id,
          childId: homework.childId,
          title: homework.title,
        },
      });

      toast.success("تم حذف الواجب");
    } catch (error) {
      toast.error(error.message || "تعذر حذف الواجب");
    }
  };

  if (allHomework.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow">
        <p className="text-gray-600">لا يوجد واجبات بعد</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-gray-800">الواجبات</h2>
        {selectedLessonId ? (
          <button
            onClick={onClearLessonFilter}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            عرض كل الواجبات
          </button>
        ) : null}
      </div>
      <div className="space-y-4">
        {allHomework.map((hw) => (
          <div key={hw.id} className="rounded-lg border border-gray-200 p-4">
            {(() => {
              const currentStatus =
                localStatusByHomework[hw.id] ||
                statusByHomeworkId[hw.id]?.status ||
                "pending";
              const isLockedDone = currentStatus === "done";

              return (
                <>
                  <div className="flex flex-col items-start justify-between gap-4">
                    <div className="flex-1">
                      {editingHomeworkId === hw.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(event) =>
                              setEditTitle(event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          />
                          <textarea
                            value={editDescription}
                            onChange={(event) =>
                              setEditDescription(event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            rows="3"
                          />
                          <input
                            type="date"
                            value={editDueDate || ""}
                            onChange={(event) =>
                              setEditDueDate(event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-bold text-gray-800">
                            {hw.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            {hw.description}
                          </p>
                        </>
                      )}
                      <div className="mt-3 flex gap-4 text-sm">
                        <span className="text-gray-700">
                          <strong>الطالب:</strong> {hw.childName}
                        </span>
                        <span className="text-gray-700">
                          <strong>المادة:</strong> {hw.subject}
                        </span>
                        <span
                          className={`rounded-full flex items-center justify-center text-center px-2 py-0.5 text-xs font-semibold ${statusClass(
                            currentStatus,
                          )}`}
                        >
                          {statusLabel(currentStatus)}
                        </span>
                      </div>
                    </div>
                    {hw.dueDate ? (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">موعد التسليم</p>
                        <p className="text-sm font-semibold text-orange-600">
                          {new Date(hw.dueDate).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {editingHomeworkId === hw.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(hw)}
                          disabled={updateHomeworkMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-400"
                        >
                          <BiSave /> حفظ
                        </button>
                        <button
                          onClick={closeEdit}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <BiX /> إلغاء
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openEdit(hw)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        <BiEdit /> تعديل
                      </button>
                    )}

                    {!isLockedDone ? (
                      <>
                        <button
                          onClick={() => changeStatus(hw, "done")}
                          disabled={updateHomeworkStatusMutation.isPending}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          تم
                        </button>
                        <button
                          onClick={() => changeStatus(hw, "not_done")}
                          disabled={updateHomeworkStatusMutation.isPending}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                        >
                          لم يتم
                        </button>
                        <button
                          onClick={() => changeStatus(hw, "pending")}
                          disabled={updateHomeworkStatusMutation.isPending}
                          className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                        >
                          قيد المتابعة
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                        تم التنفيذ - الحالة مقفلة
                      </span>
                    )}

                    <button
                      onClick={() => removeHomework(hw)}
                      disabled={deleteHomeworkMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-400"
                    >
                      <BiTrash /> حذف
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomeworkTab;
