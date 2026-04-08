import { BiBook, BiLineChart, BiMinusCircle, BiPlus } from "react-icons/bi";
import { formatToArabic12Hour } from "../../../Utils/helper";

function ChildrenTab({
  children,
  childrenLoading,
  onAddChild,
  onAssignHomework,
  onRemoveLesson,
  onOpenAnalytics,
}) {
  if (childrenLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow">
        <BiBook className="mx-auto mb-4 text-6xl text-gray-300" />
        <p className="text-lg text-gray-600">لا يوجد طلاب حالياً</p>
        <p className="mb-6 text-gray-500">
          استخدم زر "إضافة طالب" لإضافة طالب جديد
        </p>
        <button
          onClick={onAddChild}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-700"
        >
          <BiPlus className="text-xl" />
          إضافة طالب
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">الطلاب</h2>
        <button
          onClick={onAddChild}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-bold text-white hover:bg-purple-700"
        >
          <BiPlus className="text-xl" />
          إضافة طالب
        </button>
      </div>

      <div className="space-y-4">
        {children.map((lesson) => {
          return (
            <div
              key={lesson.id}
              className="rounded-lg border border-gray-200 p-4 transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">
                    {lesson.children?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    المستوى: {lesson.grade}
                  </p>
                  <p className="text-sm text-gray-600">
                    الكود:{" "}
                    <span className="font-mono">
                      {lesson.children?.studentCode}
                    </span>
                  </p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                  {lesson.subject}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2  py-3">
                <div>
                  <p className="text-xs text-gray-500">أيام الدرس</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {Array.isArray(lesson.lessonDay)
                      ? lesson.lessonDay.join(", ")
                      : lesson.lessonDay}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">وقت الدرس</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatToArabic12Hour(lesson.lessonTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">السعر</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {lesson.price} جنيه
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">عدد الواجبات</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {lesson.homework?.length || 0}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onAssignHomework(lesson)}
                  className="w-full flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <BiPlus className="mr-1 inline" />
                  إضافة واجب
                </button>
                <button
                  onClick={() => onRemoveLesson?.(lesson)}
                  className="w-full flex items-center rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
                >
                  <BiMinusCircle className="mr-1 inline" />
                  إزالة الطالب
                </button>
              </div>

              <div className="mt-2">
                <button
                  onClick={() => onOpenAnalytics?.(lesson)}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <BiLineChart className="text-base" />
                  تحليلات الطالب
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChildrenTab;
