import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BiCheckCircle, BiXCircle } from "react-icons/bi";
import toast from "react-hot-toast";
import {
  deleteHomework,
  getHomeworkStatuses,
  setHomeworkStatus,
  updateHomework,
} from "../../../Services/apiGroups";
import { addInAppNotification } from "../../../Services/apiNotifications";
import ConfirmModal from "../../../Ui/ConfirmModal";

function statusLabel(status) {
  if (status === "done") return "تم";
  if (status === "not_done") return "لم يتم";
  return "قيد الانتظار";
}

function statusClass(status) {
  if (status === "done") return "bg-green-100 text-green-700";
  if (status === "not_done") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function normalizeDueDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return iso;
}

export default function HomeworkDetailsModal({
  homework,
  mode = "edit",
  groupMembers,
  onClose,
  onSaved,
  onDeleted,
}) {
  const queryClient = useQueryClient();
  const targetChildId = homework.child_id || homework.childID || null;
  const relevantMembers = useMemo(() => {
    if (!targetChildId) return groupMembers || [];
    return (groupMembers || []).filter((member) => {
      const childId = member.child_id || member.childID;
      return childId === targetChildId;
    });
  }, [groupMembers, targetChildId]);

  const [title, setTitle] = useState(homework.title || "");
  const [description, setDescription] = useState(homework.description || "");
  const [dueDate, setDueDate] = useState(
    normalizeDueDate(homework.due_date || homework.dueDate),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = mode === "edit";
  const isStatusMode = mode === "status";

  const { data: statusRows = [], refetch: refetchStatuses } = useQuery({
    queryKey: ["homeworkStatus", homework.id],
    queryFn: () => getHomeworkStatuses(homework.id),
  });

  const statusByChild = useMemo(() => {
    return statusRows.reduce((accumulator, row) => {
      accumulator[row.childID] = {
        status: row.status,
        submittedAt: row.submitted_at || null,
        updatedAt: row.updated_at || null,
      };
      return accumulator;
    }, {});
  }, [statusRows]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateHomework(homework.id, {
        title,
        description,
        dueDate: dueDate || null,
      }),
    onSuccess: () => {
      toast.success("تم تحديث الواجب");
      onSaved?.();
    },
    onError: (error) => {
      toast.error(error.message || "تعذر تحديث الواجب");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteHomework(homework.id),
    onSuccess: () => {
      toast.success("تم حذف الواجب");
      setShowDeleteConfirm(false);
      onDeleted?.();
    },
    onError: (error) => {
      toast.error(error.message || "تعذر حذف الواجب");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ childId, status }) =>
      setHomeworkStatus(homework.id, childId, status),
    onSuccess: (_, variables) => {
      const childId = variables?.childId;
      const status = variables?.status;
      const member = (relevantMembers || []).find((item) => {
        const memberChildId = item.child_id || item.childID;
        return memberChildId === childId;
      });

      if (childId && (status === "done" || status === "not_done")) {
        addInAppNotification({
          childId,
          type: "homework_status_updated",
          title: "تحديث حالة واجب",
          message: `تم تحديث حالة واجب ${homework.title || "الواجب"} إلى ${
            status === "done" ? "تم" : "لم يتم"
          }${member?.children?.name ? ` (${member.children.name})` : ""}`,
          dedupeKey: `homework-status-${homework.id}-${childId}-${status}`,
        });
      }

      refetchStatuses();
      queryClient.invalidateQueries({ queryKey: ["studentHomeworkAnalytics"] });
      onSaved?.();
    },
    onError: (error) => {
      toast.error(error.message || "تعذر تحديث حالة الطالب");
    },
  });

  const missingStudents = useMemo(() => {
    return relevantMembers.filter((member) => {
      const childId = member.child_id || member.childID;
      return (statusByChild[childId]?.status || "pending") === "not_done";
    });
  }, [relevantMembers, statusByChild]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        dir="rtl"
      >
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-gray-800">
              {isStatusMode ? "مين عمل الواجب" : "تعديل الواجب"}
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(homework.child_id || homework.childID ? "done" : "pending")}`}
            >
              {homework.child_id || homework.childID
                ? "واجب فردي"
                : "واجب جماعي"}
            </span>
          </div>

          {isEditMode ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  عنوان الواجب
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  الوصف
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  موعد التسليم
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          ) : null}

          {isStatusMode ? (
            <div className="mt-8 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 text-lg font-bold text-gray-800">
                حالة الطلاب
              </h3>
              <div className="space-y-3">
                {relevantMembers.map((member) => {
                  const childId = member.child_id || member.childID;
                  const currentStatus =
                    statusByChild[childId]?.status || "pending";
                  const updatedAt =
                    statusByChild[childId]?.submittedAt ||
                    statusByChild[childId]?.updatedAt;
                  const isLockedDone =
                    currentStatus === "done" || currentStatus === "not_done";
                  return (
                    <div
                      key={member.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {member.children?.name}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusClass(currentStatus)}`}
                        >
                          {statusLabel(currentStatus)}
                        </span>
                        {updatedAt ? (
                          <p className="mt-1 text-xs text-gray-500">
                            آخر تحديث:{" "}
                            {new Date(updatedAt).toLocaleString("ar-EG")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        {isLockedDone ? (
                          <span className="inline-flex items-center rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                            تم تسجيل الحالة - الحالة مقفلة
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                statusMutation.mutate({
                                  childId,
                                  status: "done",
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                            >
                              <BiCheckCircle className="text-base" />
                              تم
                            </button>
                            <button
                              onClick={() =>
                                statusMutation.mutate({
                                  childId,
                                  status: "not_done",
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                              <BiXCircle className="text-base" />
                              لم يتم
                            </button>
                            <button
                              onClick={() =>
                                statusMutation.mutate({
                                  childId,
                                  status: "pending",
                                })
                              }
                              className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                            >
                              انتظار
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p className="font-bold">
                  {targetChildId
                    ? "الطالب الذي لم ينهِ الواجب:"
                    : "الطلاب الذين لم ينهوا الواجب:"}
                </p>
                <p className="mt-1">
                  {missingStudents.length > 0
                    ? missingStudents
                        .map((student) => student.children?.name)
                        .join("، ")
                    : "لا يوجد"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {isEditMode ? (
              <>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 font-bold text-white hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:bg-gray-400"
                >
                  حذف الواجب
                </button>
              </>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-50"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="حذف الواجب"
        message="هل أنت متأكد من حذف هذا الواجب؟"
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous={true}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
