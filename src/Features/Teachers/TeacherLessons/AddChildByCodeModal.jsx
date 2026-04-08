import { useState } from "react";
import { BiSearch, BiX } from "react-icons/bi";
import toast from "react-hot-toast";

function AddChildByCodeModal({
  searchMutation,
  onClose,
  onSuccess,
  existingChildIds = [],
}) {
  const [code, setCode] = useState("");
  const [foundChild, setFoundChild] = useState(null);

  const handleSearch = async (event) => {
    event.preventDefault();

    if (!code.trim()) {
      toast.error("يرجى إدخال كود الطالب");
      return;
    }

    try {
      const result = await searchMutation.mutateAsync(code);

      if (existingChildIds.includes(result?.id)) {
        toast.error("هذا الطالب مضاف بالفعل في الدروس الخصوصية");
        setFoundChild(null);
        return;
      }

      setFoundChild(result);
      toast.success("تم العثور على الطالب!");
    } catch (error) {
      toast.error(error.message || "فشل البحث");
      setFoundChild(null);
    }
  };

  const handleConfirm = () => {
    if (!foundChild) return;

    if (existingChildIds.includes(foundChild?.id)) {
      toast.error("هذا الطالب مضاف بالفعل في الدروس الخصوصية");
      return;
    }

    onSuccess?.(foundChild);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">إضافة طالب</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            type="button"
          >
            <BiX className="text-2xl" />
          </button>
        </div>

        {!foundChild ? (
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                كود الطالب *
              </label>
              <p className="mb-2 text-xs text-gray-600">
                الكود الذي حصلت عليه من والدة الطالب (مثال: AB34K9)
              </p>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="AB34K9"
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 uppercase focus:border-purple-500 focus:outline-none"
                disabled={searchMutation.isPending}
              />
            </div>

            <button
              type="submit"
              disabled={searchMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-bold text-white transition hover:bg-purple-700 disabled:bg-gray-400"
            >
              <BiSearch className="text-xl" />
              {searchMutation.isPending ? "جاري البحث..." : "بحث"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border-2 border-gray-300 py-3 font-bold text-gray-700 hover:border-gray-400"
            >
              إلغاء
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <p className="text-sm text-gray-600">
                الطالب الذي تم العثور عليه:
              </p>
              <h3 className="mt-1 text-xl font-bold text-gray-800">
                {foundChild.name}
              </h3>
              <p className="mt-1 text-gray-600">المستوى: {foundChild.grade}</p>
              <p className="text-gray-600">الكود: {foundChild.studentCode}</p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-purple-600 py-2 font-bold text-white hover:bg-purple-700"
                type="button"
              >
                تأكيد
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border-2 border-gray-300 py-2 font-bold text-gray-700"
                type="button"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddChildByCodeModal;
