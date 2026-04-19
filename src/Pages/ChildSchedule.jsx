import { useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IoChevronForward } from "react-icons/io5";
import { BsCalendar3, BsGeoAlt, BsPerson } from "react-icons/bs";
import { getAttendanceLessonKey } from "../Services/apiAttendance";
import {
  useChildById,
  useUpcomingLessonsByChild,
} from "../Features/Parents/useChildInfo";
import {
  useAddManualLesson,
  useManualLessonsByChild,
} from "../Features/Parents/useManualLessons";
import {
  useChildAttendanceRecords,
  useSaveLessonAttendance,
} from "../Features/Parents/useAttendance";
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
  const {
    data: upcomingLessons = [],
    isLoading: isUpcomingLessonsLoading,
    error: upcomingLessonsError,
  } = useUpcomingLessonsByChild(childId);
  const { mutateAsync: saveManualLesson, isPending: isSavingLesson } =
    useAddManualLesson(childId);
  const { data: attendanceRecords = [] } = useChildAttendanceRecords(childId);
  const { mutateAsync: saveAttendanceMutation, isPending: isSavingAttendance } =
    useSaveLessonAttendance(childId);

  const [attendanceReasonLesson, setAttendanceReasonLesson] = useState(null);
  const [attendanceReason, setAttendanceReason] = useState("");
  const [selectedLessonForAttendance, setSelectedLessonForAttendance] =
    useState(null);

  const normalizedLessons = useMemo(() => {
    const baseLessons = Array.isArray(lessons) ? lessons : [];
    const upcoming = Array.isArray(upcomingLessons) ? upcomingLessons : [];

    const buildSignature = (lesson) => {
      const day = Array.isArray(lesson?.lessonDay)
        ? lesson.lessonDay[0]
        : lesson?.lessonDay || lesson?.day;
      const time = lesson?.lessonTime || lesson?.time || null;
      const subject = lesson?.subject || "";
      const source = lesson?.source || "manual";
      const groupId = lesson?.groupID || lesson?.groupId || "";
      return `${source}__${groupId}__${subject}__${day || ""}__${time || ""}`;
    };

    const existingSignatures = new Set(baseLessons.map(buildSignature));

    const mappedUpcoming = upcoming
      .map((lesson, index) => {
        const day =
          lesson?.day ||
          (Array.isArray(lesson?.lessonDay) ? lesson.lessonDay[0] : null);
        const time = lesson?.lessonTime || lesson?.time || null;
        const date =
          lesson?.date ||
          (lesson?.timestamp ? String(lesson.timestamp).slice(0, 10) : null);
        const subject = lesson?.subject || "درس";
        const groupID = lesson?.groupID || lesson?.groupId || null;
        const signature = buildSignature({
          source: lesson?.source || "manual",
          groupID,
          subject,
          day,
          time,
        });

        if (existingSignatures.has(signature)) return null;

        existingSignatures.add(signature);

        return {
          id:
            lesson?.id ||
            `upcoming-${index}-${lesson?.source || "lesson"}-${day || "no-day"}-${time || "no-time"}`,
          subject,
          lessonDay: day ? [day] : [],
          lessonTime: time,
          teacherName: lesson?.teacherName || "غير محدد",
          location: lesson?.location || "غير محدد",
          price: Number(lesson?.price || 0),
          source: lesson?.source || "manual",
          date,
          groupID,
        };
      })
      .filter(Boolean);

    const merged = [...baseLessons, ...mappedUpcoming];
    const seen = new Set();

    return merged.filter((lesson) => {
      const signature = buildSignature(lesson);
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }, [lessons, upcomingLessons]);

  const isAnyLessonsLoading = isLessonsLoading || isUpcomingLessonsLoading;
  const hasLessonsError =
    Boolean(lessonsError) &&
    Boolean(upcomingLessonsError) &&
    normalizedLessons.length === 0;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [lessonTime, setLessonTime] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");

  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
      }),
    [],
  );

  const formatTime = (time) => formatToArabic12Hour(time);

  const getLessonDateTime = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return "قادم";
    return new Date(`${dateValue}T${timeValue}`);
  };

  const getStatus = (dateValue, timeValue) => {
    const lessonDateTime = getLessonDateTime(dateValue, timeValue);
    if (
      !(lessonDateTime instanceof Date) ||
      Number.isNaN(lessonDateTime.getTime())
    ) {
      return "قادم";
    }
    return lessonDateTime < new Date() ? "تم" : "قادم";
  };

  const normalizeTeacherLabel = (value) => {
    const normalized = (value || "").toString().trim();
    if (!normalized) return "";
    if (normalized === "غير محدد" || normalized === "المدرس") return "";
    return normalized;
  };

  const attendanceRecordByLessonKey = useMemo(() => {
    const map = new Map();

    attendanceRecords.forEach((record) => {
      if (!record) return;
      map.set(record.attendanceKey, record);
    });

    return map;
  }, [attendanceRecords]);

  const getAttendanceRecordForLesson = (lesson) =>
    attendanceRecordByLessonKey.get(getAttendanceLessonKey(lesson)) || null;

  const getAttendanceLabel = (record, isFutureLesson) => {
    if (!record) return "اختاري الحالة الصحيحة للحصة";

    if (isFutureLesson && record.markedByRole === "parent") {
      if (record.rawStatus === "absent") return "لن يحضر";
      if (record.rawStatus === "attending") return "سوف يحضر";
    }

    if (record.status === "attended") return "الطفل حضر";
    if (record.status === "child_absent") return "الطفل لم يحضر";
    if (record.status === "child_late") return "الطفل تأخر";
    if (record.status === "teacher_canceled") return "المدرس الغي الدرس";
    return "اختاري الحالة الصحيحة للحصة";
  };

  const getAttendanceClass = (record) => {
    const status = record?.status;
    if (status === "attended") return "bg-teal-100 text-teal-700";
    if (status === "child_absent") return "bg-red-100 text-red-700";
    if (status === "child_late") return "bg-orange-100 text-orange-700";
    if (status === "teacher_canceled") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-500";
  };

  const lessonCards = (() => {
    const cardsByKey = new Map();

    normalizedLessons.forEach((lesson) => {
      const source = lesson.source || (lesson.groupID ? "group" : "manual");
      const lessonTeacher =
        normalizeTeacherLabel(
          lesson.teacherName || lesson.teacher_name || lesson.teacher,
        ) || "غير محدد";

      if (source === "group" && lesson.groupID) {
        const key = `group-${lesson.groupID}`;
        const existing = cardsByKey.get(key);

        if (!existing) {
          cardsByKey.set(key, {
            key,
            source,
            subject: lesson.subject,
            teacherLabel: lessonTeacher,
            location: lesson.location || "غير محدد",
            price: lesson.price,
            occurrences: [lesson],
          });
          return;
        }

        existing.occurrences.push(lesson);
        return;
      }

      cardsByKey.set(`single-${lesson.id}`, {
        key: `single-${lesson.id}`,
        source,
        subject: lesson.subject,
        teacherLabel: lessonTeacher,
        location: lesson.location || "غير محدد",
        price: lesson.price,
        occurrences: [lesson],
      });
    });

    return Array.from(cardsByKey.values())
      .map((card) => ({
        ...card,
        occurrences: [...card.occurrences].sort((a, b) => {
          const first = getLessonDateTime(a.date, a.lessonTime);
          const second = getLessonDateTime(b.date, b.lessonTime);

          const firstTs =
            first instanceof Date && !Number.isNaN(first.getTime())
              ? first.getTime()
              : Number.MAX_SAFE_INTEGER;
          const secondTs =
            second instanceof Date && !Number.isNaN(second.getTime())
              ? second.getTime()
              : Number.MAX_SAFE_INTEGER;

          return firstTs - secondTs;
        }),
      }))
      .sort((a, b) => {
        const firstOccurrence = a.occurrences[0];
        const secondOccurrence = b.occurrences[0];

        const first = getLessonDateTime(
          firstOccurrence?.date,
          firstOccurrence?.lessonTime,
        );
        const second = getLessonDateTime(
          secondOccurrence?.date,
          secondOccurrence?.lessonTime,
        );

        const firstTs =
          first instanceof Date && !Number.isNaN(first.getTime())
            ? first.getTime()
            : Number.MAX_SAFE_INTEGER;
        const secondTs =
          second instanceof Date && !Number.isNaN(second.getTime())
            ? second.getTime()
            : Number.MAX_SAFE_INTEGER;

        return firstTs - secondTs;
      });
  })();

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

  const handleSaveAttendance = async ({ lesson, status, notes = "" }) => {
    if (!lesson) return;

    if (status === "will_absent" && !notes.trim()) {
      toast.error("من فضلك اكتبي سبب عدم الحضور");
      return;
    }

    try {
      await saveAttendanceMutation({
        childId,
        childName: child?.name || "الطفل",
        lesson,
        status,
        notes: notes.trim(),
      });

      setAttendanceReasonLesson(null);
      setAttendanceReason("");
      setSelectedLessonForAttendance(null);

      toast.success(
        status === "will_absent"
          ? "تم حفظ سبب عدم الحضور"
          : "تم حفظ حالة الحضور",
      );
    } catch (saveError) {
      console.error(saveError);
      toast.error("حدث خطأ أثناء حفظ حالة الحضور");
    }
  };

  const handleWillAttend = (lesson) => {
    handleSaveAttendance({ lesson, status: "will_attend" });
  };

  const handleWillNotAttend = (lesson) => {
    setAttendanceReasonLesson(lesson);
    setAttendanceReason("");
  };

  const handleConfirmReason = async () => {
    if (!attendanceReasonLesson) return;
    await handleSaveAttendance({
      lesson: attendanceReasonLesson,
      status: "will_absent",
      notes: attendanceReason,
    });
  };

  const submitAttendanceStatus = async (status) => {
    if (!selectedLessonForAttendance) return;

    await handleSaveAttendance({
      lesson: selectedLessonForAttendance,
      status,
    });
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
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
        >
          <IoChevronForward className="text-2xl" />
          <span className="text-lg font-semibold">جدول الحصص </span>
        </button>
      </div>

      <div className="px-4 pt-6 space-y-4">
        {isAnyLessonsLoading && (
          <div className="text-center text-gray-600">جاري تحميل الحصص...</div>
        )}

        {hasLessonsError && (
          <div className="text-center text-red-500">حدث خطأ في تحميل الحصص</div>
        )}

        {!isAnyLessonsLoading &&
          !hasLessonsError &&
          lessonCards.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 text-center text-gray-600">
              لا توجد حصص بعد. اضغطي على إضافة درس لإضافة أول حصة.
            </div>
          )}

        {lessonCards.map((card) => (
          <div
            key={card.key}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-right">
                <h3 className="text-2xl font-bold text-gray-900 leading-none mb-1">
                  {card.subject}
                </h3>
              </div>

              {card.source === "group" ? (
                <span className="text-sm font-bold rounded-full px-3 py-1 bg-indigo-100 text-indigo-700">
                  مجموعة
                </span>
              ) : null}
            </div>

            <div dir="ltr" className="space-y-1 text-base text-gray-600">
              <div className="flex items-center justify-end gap-2">
                <span>{card.teacherLabel}</span>
                <BsPerson className="text-gray-500" />
              </div>
              <div className="flex items-center justify-end gap-2">
                <span>{card.location || "غير محدد"}</span>
                <BsGeoAlt className="text-gray-500" />
              </div>
            </div>

            <div
              dir="ltr"
              className="mt-2 flex items-center justify-end gap-2 text-gray-900 font-bold text-3xl"
            >
              <span dir="rtl" className="flex items-center gap-1">
                {card.price || 0} ج.م
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {card.occurrences.map((lesson) => {
                const status = getStatus(lesson.date, lesson.lessonTime);
                const statusClass =
                  status === "قادم"
                    ? "text-cyan-500 bg-cyan-100"
                    : "text-gray-900 bg-gray-100";
                const lessonDateTime = getLessonDateTime(
                  lesson.date,
                  lesson.lessonTime,
                );
                const attendanceRecord = getAttendanceRecordForLesson(lesson);
                const hasAttendanceStatus = Boolean(attendanceRecord);
                const hasParentDecision =
                  attendanceRecord?.markedByRole === "parent" &&
                  (attendanceRecord?.rawStatus === "attending" ||
                    attendanceRecord?.rawStatus === "absent" ||
                    attendanceRecord?.rawStatus === "will_attend" ||
                    attendanceRecord?.rawStatus === "will_absent");
                const isFutureLesson =
                  lessonDateTime instanceof Date &&
                  !Number.isNaN(lessonDateTime.getTime())
                    ? lessonDateTime > new Date()
                    : false;
                const dayText = Array.isArray(lesson.lessonDay)
                  ? lesson.lessonDay[0]
                  : lesson.lessonDay;

                return (
                  <div
                    key={lesson.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div
                        dir="ltr"
                        className="flex items-center justify-end gap-2 text-base text-gray-700"
                      >
                        <span>
                          {dayText} - {formatTime(lesson.lessonTime)}
                        </span>
                        <BsCalendar3 className="text-gray-500" />
                      </div>

                      <span
                        className={`text-sm font-bold rounded-full px-3 py-1 ${statusClass}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs px-2 py-1 text-center rounded-full font-semibold ${getAttendanceClass(attendanceRecord)}`}
                      >
                        {getAttendanceLabel(attendanceRecord, isFutureLesson)}
                      </span>

                      {isFutureLesson && !hasParentDecision ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isSavingAttendance}
                            onClick={() => handleWillNotAttend(lesson)}
                            className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                          >
                            مش يحضر
                          </button>
                          <button
                            type="button"
                            disabled={isSavingAttendance}
                            onClick={() => handleWillAttend(lesson)}
                            className="text-sm px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            هيحضر
                          </button>
                        </div>
                      ) : hasAttendanceStatus ? (
                        <span className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 border border-gray-200">
                          تم التحديث
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedLessonForAttendance(lesson)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                        >
                          تحديث الحالة
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
                  className="w-1/2 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
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
              <div>
                {normalizeTeacherLabel(
                  selectedLessonForAttendance.teacherName ||
                    selectedLessonForAttendance.teacher_name,
                ) || "غير محدد"}
              </div>
              <div>{formatTime(selectedLessonForAttendance.lessonTime)}</div>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                disabled={isSavingAttendance}
                onClick={() => submitAttendanceStatus("attending")}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xl disabled:opacity-50"
              >
                الطفل حضر
              </button>

              <button
                type="button"
                disabled={isSavingAttendance}
                onClick={() => submitAttendanceStatus("child_absent")}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xl disabled:opacity-50"
              >
                الطفل لم يحضر
              </button>

              <button
                type="button"
                disabled={isSavingAttendance}
                onClick={() => submitAttendanceStatus("child_late")}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl disabled:opacity-50"
              >
                الطفل تأخر
              </button>

              <button
                type="button"
                disabled={isSavingAttendance}
                onClick={() => submitAttendanceStatus("teacher_canceled")}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xl disabled:opacity-50"
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

      {attendanceReasonLesson && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <h3 className="text-xl font-bold text-gray-900">
              سبب عدم الحضور
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              اكتبي سبب عدم حضور {child?.name || "الطفل"} لهذه الحصة، وسيصل
              للمدرس فوراً.
            </p>

            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <div className="font-semibold text-gray-900">
                {attendanceReasonLesson.subject}
              </div>
              <div className="mt-1">
                {normalizeTeacherLabel(
                  attendanceReasonLesson.teacherName ||
                    attendanceReasonLesson.teacher_name,
                ) || "غير محدد"}
              </div>
              <div className="mt-1">{formatTime(attendanceReasonLesson.lessonTime)}</div>
            </div>

            <textarea
              value={attendanceReason}
              onChange={(event) => setAttendanceReason(event.target.value)}
              rows={4}
              placeholder="مثال: عندنا ظرف عائلي اليوم"
              className="mt-4 w-full rounded-xl border border-gray-300 p-3 text-right outline-none focus:border-blue-600"
            />

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAttendanceReasonLesson(null);
                  setAttendanceReason("");
                }}
                className="w-1/2 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSavingAttendance}
                onClick={handleConfirmReason}
                className="w-1/2 rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50"
              >
                {isSavingAttendance ? "جاري الحفظ..." : "إرسال السبب"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 p-4 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-3"
        >
          <span className="text-2xl leading-none">+</span>
          إضافة درس
        </button>
      </div>
    </div>
  );
}

export default ChildSchedule;
