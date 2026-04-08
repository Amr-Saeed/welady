import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { IoChevronForward } from "react-icons/io5";
import { BsCalendar3, BsCheckLg, BsPerson } from "react-icons/bs";
import { useChildById } from "../Features/Parents/useChildInfo";
import {
  useAddHomework,
  useDeleteHomework,
  useHomeworksByChild,
  useHomeworkStatuses,
} from "../Features/Parents/useHomework";
import { addInAppNotification } from "../Services/apiNotifications";

function ChildHomework() {
  const navigate = useNavigate();
  const { childId } = useParams();
  const { data: child, isLoading, error } = useChildById(childId);
  const {
    data: homeworks = [],
    isLoading: isHomeworksLoading,
    error: homeworksError,
  } = useHomeworksByChild(childId);
  const homeworkIds = homeworks.map((hw) => hw.id);
  const { data: statusRows = [] } = useHomeworkStatuses(childId, homeworkIds);
  const { mutateAsync: saveHomework, isPending: isSavingHomework } =
    useAddHomework(childId);
  const { mutateAsync: removeHomework, isPending: isDeletingHomework } =
    useDeleteHomework(childId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [homeworkToDelete, setHomeworkToDelete] = useState(null);

  const statusByHomeworkId = statusRows.reduce((accumulator, row) => {
    accumulator[row.homeworkID] = {
      status: String(row.status || "").toLowerCase(),
      updatedAt: row.updated_at || null,
      submittedAt: row.submitted_at || null,
    };
    return accumulator;
  }, {});

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-red-600">حدث خطأ في تحميل الواجب</p>
      </div>
    );
  }

  const formatDate = (value) => {
    if (!value) return "";
    const [y, m, d] = value.split("-");
    return `${d}-${m}-${y}`;
  };

  const getStatus = (dueDateValue) => {
    if (!dueDateValue) return "لم يبدأ";
    const now = new Date();
    const due = new Date(`${dueDateValue}T23:59:59`);
    return due < now ? "جاري" : "لم يبدأ";
  };

  const getStatusClass = (status) => {
    if (status === "جاري") return "text-amber-500 bg-amber-50";
    return "text-gray-500 bg-gray-100";
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setTeacherName("");
  };

  const parseHomeworkData = (rawDescription) => {
    if (!rawDescription) {
      return { teacher: "غير محدد", details: "" };
    }

    const match = rawDescription.match(/^__teacher:(.*?)__\n([\s\S]*)$/);
    if (match) {
      return {
        teacher: match[1] || "غير محدد",
        details: match[2] || "",
      };
    }

    return {
      teacher: "غير محدد",
      details: rawDescription,
    };
  };

  const handleAddHomework = async (e) => {
    e.preventDefault();

    if (!title || !description || !dueDate || !teacherName) {
      toast.error("من فضلك اكملي كل بيانات الواجب");
      return;
    }

    try {
      await saveHomework({
        childId,
        title,
        description,
        dueDate,
        teacherName,
      });

      addInAppNotification({
        childId,
        type: "homework_new",
        title: "واجب جديد",
        message: `تمت إضافة واجب جديد: ${title}`,
        dedupeKey: `homework-new-${childId}-${title}-${dueDate}`,
      });

      toast.success("تم إضافة الواجب بنجاح");
      setIsFormOpen(false);
      resetForm();
    } catch (saveError) {
      console.error(saveError);
      toast.error("حدث خطأ أثناء حفظ الواجب");
    }
  };

  const handleConfirmDelete = async () => {
    if (!homeworkToDelete) return;

    try {
      await removeHomework({
        homeworkId: homeworkToDelete.id,
        childId,
      });
      toast.success("تم حذف الواجب بنجاح");
      setHomeworkToDelete(null);
    } catch (deleteError) {
      console.error(deleteError);
      toast.error("حدث خطأ أثناء حذف الواجب");
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 pb-28 max-w-md mx-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate(`/parent/child/${childId}`)}
          className="flex items-center gap-2 text-gray-700 hover:text-[var(--main-color)] transition-colors"
        >
          <IoChevronForward className="text-2xl" />
          <span className="text-lg font-semibold"> الواجبات </span>
        </button>
      </div>

      <div className="px-4 pt-6 space-y-4">
        {isHomeworksLoading && (
          <div className="text-center text-gray-600">
            جاري تحميل الواجبات...
          </div>
        )}

        {homeworksError && (
          <div className="text-center text-red-500">
            حدث خطأ في تحميل الواجبات
          </div>
        )}

        {!isHomeworksLoading && !homeworksError && homeworks.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 text-center text-gray-600">
            لا توجد واجبات بعد. اضغطي على إضافة واجب لإضافة أول واجب.
          </div>
        )}

        {homeworks.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5"
          >
            {(() => {
              const statusInfo = statusByHomeworkId[item.id];
              const isDone = statusInfo?.status === "done";
              const status = isDone ? "تم" : getStatus(item.dueDate);
              const statusClass = isDone
                ? "text-green-700 bg-green-50"
                : getStatusClass(status);
              const parsed = parseHomeworkData(item.description);

              return (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-right">
                      <h3
                        className={`text-2xl font-bold leading-none mb-1 ${
                          isDone
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-lg font-bold ${statusClass}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div
                    dir="ltr"
                    className="flex items-center justify-end gap-2 text-base text-gray-600 mb-2"
                  >
                    <span>{parsed.teacher}</span>
                    <BsPerson className="text-gray-500" />
                  </div>

                  <p
                    className={`text-lg leading-8 text-right mb-2 ${
                      isDone ? "text-gray-500 line-through" : "text-gray-800"
                    }`}
                  >
                    {parsed.details}
                  </p>

                  <div
                    dir="ltr"
                    className="flex items-center justify-end gap-2 text-base text-gray-600 mb-4"
                  >
                    <span>موعد التسليم: {formatDate(item.dueDate)}</span>
                    <BsCalendar3 className="text-gray-500" />
                  </div>

                  {isDone &&
                  (statusInfo?.submittedAt || statusInfo?.updatedAt) ? (
                    <div className="mb-4 rounded-lg bg-green-50 p-2 text-right text-sm text-green-700">
                      تم تنفيذ الواجب في:{" "}
                      {new Date(
                        statusInfo.submittedAt || statusInfo.updatedAt,
                      ).toLocaleString("ar-EG")}
                    </div>
                  ) : null}

                  {!isDone ? (
                    <button
                      type="button"
                      onClick={() => setHomeworkToDelete(item)}
                      className="w-full bg-[var(--main-color)] hover:bg-[var(--main-dark-color)] text-white font-bold py-3 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
                    >
                      <BsCheckLg />
                      تم
                    </button>
                  ) : null}
                </>
              );
            })()}
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">إضافة واجب يدوي</h2>

            <form onSubmit={handleAddHomework} className="space-y-3">
              <input
                type="text"
                placeholder="عنوان الواجب"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              <textarea
                placeholder="وصف الواجب"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 min-h-28"
              />

              <input
                type="text"
                placeholder="اسم المدرس"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              <label className="block text-sm font-semibold text-gray-700">
                اخر موعد للتسليم
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingHomework}
                  className="w-1/2 py-3 rounded-xl bg-[var(--main-color)] text-white font-bold disabled:opacity-50"
                >
                  {isSavingHomework ? "جاري الحفظ..." : "حفظ الواجب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 p-4 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="w-full bg-[var(--main-color)] hover:bg-[var(--main-dark-color)] text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-3"
        >
          <span className="text-2xl leading-none">+</span>
          إضافة واجب
        </button>
      </div>

      {homeworkToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                هل تم حل الواجب؟
              </h3>
              <p className="text-gray-600 mb-5">سيتم حذف الواجب من القائمة.</p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setHomeworkToDelete(null)}
                  className="w-1/2 py-3 rounded-xl border border-gray-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingHomework}
                  className="w-1/2 py-3 rounded-xl bg-[var(--main-color)] text-white font-bold disabled:opacity-50"
                >
                  {isDeletingHomework ? "جاري..." : "تأكيد"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default ChildHomework;
