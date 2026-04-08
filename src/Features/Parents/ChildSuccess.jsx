import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useParentProfile } from "./useParentProfile";

function ChildSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: parentProfile } = useParentProfile();
  const { childData } = location.state || {};

  if (!childData) {
    // If no child data, redirect to parent dashboard
    navigate("/parent", { replace: true });
    return null;
  }

  const handleDone = async () => {
    // Invalidate the children query so it refetches with the new child
    if (parentProfile?.id) {
      await queryClient.invalidateQueries({
        queryKey: ["children", parentProfile.id],
      });
    }
    navigate("/parent");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(childData.studentCode);
    toast.success("تم نسخ الكود بنجاح!");
  };

  return (
    <div
      dir="rtl"
      className="p-6 flex flex-col items-center justify-center min-h-screen"
    >
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center mb-6">
        <svg
          className="w-12 h-12 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold mb-2 text-center">
        تم إضافة {childData.name} بنجاح
      </h2>
      <p className="text-gray-600 text-sm mb-8 text-center">
        شارك الكود ده مع المدرس
      </p>

      {/* Code Display Box */}
      <div className="w-full max-w-md bg-white border-2 border-[var(--main-color)] rounded-2xl p-6 mb-6">
        <p className="text-center text-gray-600 text-sm mb-3">كود المشاركة</p>
        <div className="text-center text-4xl font-bold text-[var(--main-color)] mb-4 tracking-wider">
          {childData.studentCode}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopyCode}
          className="w-full bg-[var(--main-color)] hover:bg-[var(--main-dark-color)] text-white font-bold py-4 px-6 rounded-xl transition-colors duration-300 flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          نسخ الكود
        </button>
      </div>

      {/* Instructions */}
      <div className="w-full max-w-md bg-[rgba(124,178,231,0.3)] border-[1px] border-[var(--main-color)] rounded-2xl p-6 mb-6">
        <p className="font-bold text-center mb-4">كيفية المشاركة:</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--main-color)] text-white flex items-center justify-center flex-shrink-0 font-bold">
              1
            </div>
            <p className="text-sm pt-1">انسخي الكود من فوق</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--main-color)] text-white flex items-center justify-center flex-shrink-0 font-bold">
              2
            </div>
            <p className="text-sm pt-1">ابعتيه للمدرس عن طريق واتس أو رسالة</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--main-color)] text-white flex items-center justify-center flex-shrink-0 font-bold">
              3
            </div>
            <p className="text-sm pt-1">المدرس يدخل الكود في تطبيقه</p>
          </div>
        </div>
      </div>

      {/* Done Button */}
      <button
        onClick={handleDone}
        className="w-full max-w-md bg-[var(--main-color)] hover:bg-[var(--main-dark-color)] text-white font-bold py-4 px-10 rounded-xl transition-colors duration-300 text-xl"
      >
        تم
      </button>
    </div>
  );
}

export default ChildSuccess;
