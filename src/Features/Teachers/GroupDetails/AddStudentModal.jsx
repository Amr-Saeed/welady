import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BiSearch, BiX } from "react-icons/bi";
import toast from "react-hot-toast";
import { searchChildByCode } from "../../../Services/apiTeacherChildren";
import { addMemberToGroup } from "../../../Services/apiGroups";

export default function AddStudentModal({
  isOpen,
  groupId,
  onClose,
  onSuccess,
  existingChildIds = [],
}) {
  const [studentCode, setStudentCode] = useState("");
  const [foundStudent, setFoundStudent] = useState(null);

  const searchMutation = useMutation({
    mutationFn: (code) => searchChildByCode(code),
    onSuccess: (data) => {
      setFoundStudent(data);
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في البحث عن الطالب");
      setFoundStudent(null);
    },
  });

  const addStudentMutation = useMutation({
    mutationFn: () =>
      addMemberToGroup(groupId, foundStudent.id, foundStudent.parentID),
    onSuccess: () => {
      toast.success(`تمت إضافة الطالب ${foundStudent.name} إلى المجموعة بنجاح`);
      resetModal();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في إضافة الطالب");
    },
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!studentCode.trim()) {
      toast.error("يرجى إدخال كود الطالب");
      return;
    }

    try {
      const found = await searchMutation.mutateAsync(studentCode.trim());
      if (existingChildIds.includes(found?.id)) {
        toast.error("هذا الطالب مضاف بالفعل في المجموعة");
        setFoundStudent(null);
      }
    } catch {
      // handled in mutation onError
    }
  };

  const handleAddStudent = async () => {
    if (!foundStudent) return;

    if (existingChildIds.includes(foundStudent?.id)) {
      toast.error("هذا الطالب مضاف بالفعل في المجموعة");
      return;
    }

    addStudentMutation.mutate();
  };

  const resetModal = () => {
    setStudentCode("");
    setFoundStudent(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={resetModal}></div>

      {/* Modal */}
      <div
        className="relative mx-4 max-w-md rounded-lg bg-white p-6 shadow-lg"
        dir="rtl"
      >
        {/* Close Button */}
        <button
          onClick={resetModal}
          className="absolute left-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <BiX className="text-2xl" />
        </button>

        {/* Title */}
        <h2 className="mb-6 pr-6 text-lg font-semibold text-gray-900">
          إضافة طالب إلى المجموعة
        </h2>

        {!foundStudent ? (
          // Search Form
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                كود الطالب
              </label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => {
                  setStudentCode(e.target.value);
                  setFoundStudent(null);
                }}
                placeholder="مثال: AB34K9"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-right font-mono text-lg uppercase placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                يمكن للولي العثور على الكود في ملف بيانات الطالب
              </p>
            </div>

            <button
              type="submit"
              disabled={searchMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BiSearch className="text-lg" />
              بحث
            </button>
          </form>
        ) : (
          // Student Info
          <div className="space-y-4">
            <div className="rounded-lg border border-purple-200 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase text-gray-500">
                بيانات الطالب
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600">الاسم</p>
                  <p className="font-semibold text-gray-800">
                    {foundStudent.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">الصف</p>
                  <p className="font-semibold text-gray-800">
                    {foundStudent.grade}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">كود الطالب</p>
                  <p className="font-mono text-sm font-semibold text-blue-600">
                    {foundStudent.studentCode}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddStudent}
                disabled={addStudentMutation.isPending}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                تأكيد الإضافة
              </button>
              <button
                onClick={() => {
                  setFoundStudent(null);
                  setStudentCode("");
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                بحث آخر
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
