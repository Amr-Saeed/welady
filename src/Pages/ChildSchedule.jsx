import { useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IoChevronForward } from "react-icons/io5";
import { BsCalendar3, BsGeoAlt, BsPerson } from "react-icons/bs";
import {
  getLessonAttendanceStatus,
  setLessonAttendanceStatus,
} from "../Services/apiAttendance";
import { addInAppNotification } from "../Services/apiNotifications";
import { useChildById } from "../Features/Parents/useChildInfo";
import {
  useAddManualLesson,
  useManualLessonsByChild,
} from "../Features/Parents/useManualLessons";
import { formatToArabic12Hour } from "../Utils/helper";

function ChildSchedule() {
  const navigate = useNavigate();
  const { childId } = useParams();
  const { data: child, isLoading, error } = useChildById(childId);
  const {
    data: lessons = [],
    isLoading: isLessonsLoading,
    error: lessonsError,
  } = useManualLessonsByChild(childId);
  const { mutateAsync: saveManualLesson, isPending: isSavingLesson } =
    useAddManualLesson(childId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [lessonTime, setLessonTime] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLessonForAttendance, setSelectedLessonForAttendance] =
    useState(null);

  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
      }),
    [],
  );

  const formatTime = (time) => formatToArabic12Hour(time);

  const getStatus = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return "قادم";
    const lessonDateTime = new Date(`${dateValue}T${timeValue}`);
    return lessonDateTime < new Date() ? "تم" : "قادم";
  };

  const attendanceLabel = (status) => {
    if (status === "attended") return "الطفل حضر";
    if (status === "child_absent") return "الطفل لم يحضر";
    if (status === "child_late") return "الطفل تأخر";
    if (status === "teacher_canceled") return "المدرس الغي الدرس";
    return "اختاري الحالة الصحيحة للحصة";
  };

  const attendanceClass = (status) => {
    if (status === "attended") return "bg-emerald-100 text-emerald-700";
    if (status === "child_absent") return "bg-red-100 text-red-700";
    if (status === "child_late") return "bg-orange-100 text-orange-700";
    if (status === "teacher_canceled") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-500";
  };

  const attendanceStatusByLesson = {};
  lessons.forEach((lesson) => {
    attendanceStatusByLesson[lesson.id] = getLessonAttendanceStatus(
      childId,
      lesson.id,
    );
  });

  const resetForm = () => {
    setSubject("");
    setLessonDate("");
    setLessonTime("");
    setTeacherName("");
    setPrice("");
    setLocation("");
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();

    if (!subject || !lessonDate || !lessonTime || !teacherName || !price) {
      toast.error("من فضلك اكملي كل بيانات الدرس");
      return;
    }

    const dayName = weekdayFormatter.format(new Date(lessonDate));

    try {
      await saveManualLesson({
        childId,
        subject,
        lessonDay: dayName,
        lessonTime,
        teacherName,
        price: Number(price),
        date: lessonDate,
        location: location || "غير محدد",
      });

      toast.success("تم إضافة الدرس بنجاح");
      setIsFormOpen(false);
      resetForm();
    } catch (saveError) {
      console.error(saveError);
      toast.error("حدث خطأ أثناء حفظ الدرس");
    }
  };

  const submitAttendanceStatus = (status) => {
    if (!selectedLessonForAttendance) return;

    setLessonAttendanceStatus({
      childId,
      lesson: selectedLessonForAttendance,
      status,
    });

    if (status === "child_absent") {
      addInAppNotification({
        childId,
        type: "attendance_absent",
        title: "تنبيه حضور",
        message: `الطفل لم يحضر درس ${selectedLessonForAttendance.subject}`,
        dedupeKey: `attendance-absent-${childId}-${selectedLessonForAttendance.id}-${selectedLessonForAttendance.date}`,
      });
    }

    if (status === "child_late") {
      addInAppNotification({
        childId,
        type: "attendance_late",
        title: "تنبيه حضور",
        message: `الطفل تأخر على درس ${selectedLessonForAttendance.subject}`,
        dedupeKey: `attendance-late-${childId}-${selectedLessonForAttendance.id}-${selectedLessonForAttendance.date}`,
      });
    }

    setSelectedLessonForAttendance(null);
    toast.success("تم حفظ حالة الحصة");
  };

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
        <p className="text-xl text-red-600">حدث خطأ في تحميل الجدول</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 pb-28 max-w-md mx-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate(`/parent/child/${childId}`)}
          className="flex items-center gap-2 text-gray-700 hover:text-[var(--main-color)] transition-colors"
        >
          <IoChevronForward className="text-2xl" />
          <span className="text-lg font-semibold">جدول الحصص </span>
        </button>
      </div>

      <div className="px-4 pt-6 space-y-4">
        {isLessonsLoading && (
          <div className="text-center text-gray-600">جاري تحميل الحصص...</div>
        )}

        {lessonsError && (
          <div className="text-center text-red-500">حدث خطأ في تحميل الحصص</div>
        )}

        {!isLessonsLoading && !lessonsError && lessons.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 text-center text-gray-600">
            لا توجد حصص بعد. اضغطي على إضافة درس لإضافة أول حصة.
          </div>
        )}

        {lessons.map((lesson) => {
          const attendanceStatus = attendanceStatusByLesson[lesson.id];
          const status = getStatus(lesson.date, lesson.lessonTime);
          const statusClass =
            status === "قادم"
              ? "text-cyan-500 bg-cyan-100"
              : "text-gray-900 bg-gray-100";

          const dayText = Array.isArray(lesson.lessonDay)
            ? lesson.lessonDay[0]
            : lesson.lessonDay;

          return (
            <div
              key={lesson.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-right">
                  <h3 className="text-2xl font-bold text-gray-900 leading-none mb-1">
                    {lesson.subject}
                  </h3>
                </div>
                <span
                  className={`text-lg font-bold rounded-full px-3 py-1 ${statusClass}`}
                >
                  {status}
                </span>
              </div>

              <div dir="ltr" className="space-y-1 text-base text-gray-600">
                <div className="flex items-center justify-end gap-2">
                  <span>{lesson.teacherName}</span>
                  <BsPerson className="text-gray-500" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span>
                    {dayText} - {formatTime(lesson.lessonTime)}
                  </span>
                  <BsCalendar3 className="text-gray-500" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span>{lesson.location || "غير محدد"}</span>
                  <BsGeoAlt className="text-gray-500" />
                </div>
              </div>

              <div
                dir="ltr"
                className="mt-2 flex items-center justify-end gap-2 text-gray-900 font-bold text-3xl"
              >
                <span dir="rtl" className="flex items-center gap-1">
                  {lesson.price} ج.م
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${attendanceClass(attendanceStatus)}`}
                >
                  {attendanceLabel(attendanceStatus)}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedLessonForAttendance(lesson)}
                  className="text-sm px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                >
                  تحديث الحالة
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">إضافة درس يدوي</h2>

            <form onSubmit={handleAddLesson} className="space-y-3">
              <input
                type="text"
                placeholder="المادة"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              <input
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              <input
                type="time"
                value={lessonTime}
                onChange={(e) => setLessonTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              <input
                type="text"
                placeholder="اسم المدرس"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              <input
                type="text"
                placeholder="المكان (اختياري)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              <input
                type="number"
                min="0"
                placeholder="السعر"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
                  disabled={isSavingLesson}
                  className="w-1/2 py-3 rounded-xl bg-[var(--main-color)] text-white font-bold disabled:opacity-50"
                >
                  {isSavingLesson ? "جاري الحفظ..." : "حفظ الدرس"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLessonForAttendance && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5">
            <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 font-bold text-2xl mx-auto flex items-center justify-center mb-3">
              {selectedLessonForAttendance.subject?.[0] || "د"}
            </div>

            <h3 className="text-3xl font-bold text-center text-gray-900 leading-tight">
              درس {selectedLessonForAttendance.subject}
            </h3>

            <div className="mt-4 bg-gray-50 rounded-xl p-4 text-center space-y-2 text-lg text-gray-800">
              <div>{selectedLessonForAttendance.teacherName}</div>
              <div>{formatTime(selectedLessonForAttendance.lessonTime)}</div>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => submitAttendanceStatus("attended")}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xl"
              >
                الطفل حضر
              </button>

              <button
                type="button"
                onClick={() => submitAttendanceStatus("child_absent")}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xl"
              >
                الطفل لم يحضر
              </button>

              <button
                type="button"
                onClick={() => submitAttendanceStatus("child_late")}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl"
              >
                الطفل تأخر
              </button>

              <button
                type="button"
                onClick={() => submitAttendanceStatus("teacher_canceled")}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xl"
              >
                المدرس الغي الدرس
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLessonForAttendance(null)}
              className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              إغلاق
            </button>
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
          إضافة درس
        </button>
      </div>
    </div>
  );
}

export default ChildSchedule;
