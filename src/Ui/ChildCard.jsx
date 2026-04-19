import { BiArrowToLeft } from "react-icons/bi";
import { BsArrowBarLeft, BsStopwatch } from "react-icons/bs";
import { IoCopyOutline } from "react-icons/io5";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { formatToArabic12Hour } from "../Utils/helper";
import { useNearestLessonByChild } from "../Features/Parents/useChildInfo";

function formatDayName(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ar-EG", { weekday: "long" });
}

function formatDateLabel(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function ChildCard({ child }) {
  const navigate = useNavigate();
  const { data: nearestLesson, isLoading: nearestLessonLoading } =
    useNearestLessonByChild(child?.id);

  const handleCopyCode = (e) => {
    e.stopPropagation(); // Prevent navigation when copying
    navigator.clipboard.writeText(child.studentCode);
    toast.success("تم نسخ الكود بنجاح!");
  };

  const handleCardClick = () => {
    navigate(`/parent/child/${child.id}`);
  };

  return (
    <div
      dir="rtl"
      onClick={handleCardClick}
      className="bg-white border-2 border-[var(--main-color)] rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="mb-3 p-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">{child.name}</h3>
          <BsArrowBarLeft className="text-2xl text-[var(--main-color)]" />
        </div>
        <p className="text-gray-600 text-sm mt-1">{child.grade}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200  border-b p-2">
        <p className="text-xl text-gray-500 mb-1 ">كود المشاركة</p>
        <div className="flex items-center justify-between gap-2">
          <p
            onClick={handleCopyCode}
            className="text-lg font-bold text-[var(--main-color)] tracking-wider cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-colors select-all"
            title="اضغط للنسخ"
          >
            {child.studentCode}
          </p>
          <button
            onClick={handleCopyCode}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="نسخ الكود"
          >
            <IoCopyOutline className="text-xl text-[var(--main-color)]" />
          </button>
        </div>
      </div>

      <div className="mt-4 shadow-2xl pt-4 bg-[var(--main-verylite-color)] rounded-lg p-2 ">
        <p className="text-xl text-gray-500 mb-1">أقرب معاد لدرس</p>
        <div className="flex items-center gap-1">
          <BsStopwatch className="text-2xl text-[var(--main-color)] mt-2" />
          <div>
            {nearestLessonLoading ? (
              <p className="text-sm text-gray-600">جاري تحميل أقرب موعد...</p>
            ) : nearestLesson ? (
              <>
                <h4 className="text-lg font-bold text-[var(--main-color)] tracking-wider cursor-pointer">
                  {nearestLesson.subject} ({nearestLesson.typeLabel})
                </h4>
                <p>
                  الموعد: {formatDayName(nearestLesson.timestamp)} -{" "}
                  {formatDateLabel(nearestLesson.timestamp)}
                  {nearestLesson.time
                    ? ` الساعة ${formatToArabic12Hour(nearestLesson.time)}`
                    : ""}
                </p>
                <p>المكان: {nearestLesson.location || "غير محدد"}</p>
              </>
            ) : (
              <p className="text-sm text-gray-600">لا يوجد موعد قادم حالياً</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChildCard;
