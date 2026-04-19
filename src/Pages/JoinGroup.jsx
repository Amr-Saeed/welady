import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BiArrowBack } from "react-icons/bi";
import toast from "react-hot-toast";
import { useParentProfile } from "../Features/Parents/useParentProfile";
import { getGroupByCode, addMemberToGroup } from "../Services/apiGroups";
import { useChildrenByParent } from "../Features/Parents/useChildInfo";
import {
  getManualLessonsByChildId,
  addManualLesson,
} from "../Services/apiManualLessons";
import {
  getLessonExpensesByChildId,
  setLessonExpenseStatusByLesson,
} from "../Services/apiLessonExpenses";

function normalizeDayList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeTimeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function nextOccurrenceDate(dayName, timeValue) {
  const dayNames = {
    الأحد: 0,
    الاثنين: 1,
    الثلاثاء: 2,
    الأربعاء: 3,
    الخميس: 4,
    الجمعة: 5,
    السبت: 6,
  };

  const dayIndex = dayNames[dayName];
  if (dayIndex === undefined) return null;

  const now = new Date();
  const candidate = new Date(now);
  const currentDay = now.getDay();
  let diff = dayIndex - currentDay;
  if (diff < 0) diff += 7;
  candidate.setDate(now.getDate() + diff);

  const [hoursRaw = "23", minutesRaw = "59"] = String(
    timeValue || "23:59",
  ).split(":");
  candidate.setHours(
    Number.parseInt(hoursRaw, 10) || 0,
    Number.parseInt(minutesRaw, 10) || 0,
    0,
    0,
  );

  if (candidate < now) {
    candidate.setDate(candidate.getDate() + 7);
  }

  return candidate.toISOString().slice(0, 10);
}

function JoinGroup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [groupCode, setGroupCode] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [foundGroup, setFoundGroup] = useState(null);
  const [step, setStep] = useState("code"); // 'code' or 'child'

  const { data: parentProfile } = useParentProfile();
  const { data: children } = useChildrenByParent();

  // Search for group by code
  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!groupCode.trim()) {
        throw new Error("يرجى إدخال الكود");
      }
      const group = await getGroupByCode(groupCode.trim());
      return group;
    },
    onSuccess: (group) => {
      setFoundGroup(group);
      setStep("child");
      toast.success("تم العثور على المجموعة!");
    },
    onError: (error) => {
      toast.error(error.message || "الكود غير صحيح");
    },
  });

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChildId) {
        throw new Error("يرجى اختيار الطالب");
      }
      if (!foundGroup) {
        throw new Error("لم يتم العثور على المجموعة");
      }
      await addMemberToGroup(foundGroup.id, selectedChildId, parentProfile.id);
    },
    onSuccess: async () => {
      const [existingLessons, existingExpenses] = await Promise.all([
        getManualLessonsByChildId(selectedChildId).catch(() => []),
        getLessonExpensesByChildId(selectedChildId).catch(() => []),
      ]);

      const normalizedGroupSchedule = Array.isArray(foundGroup?.group_schedule)
        ? foundGroup.group_schedule
        : [];
      const lessonDays =
        normalizeDayList(foundGroup?.lessonDays).length > 0
          ? normalizeDayList(foundGroup?.lessonDays)
          : normalizedGroupSchedule
              .map((slot) => slot?.day_of_week || slot?.day)
              .filter(Boolean);
      const lessonTimes =
        normalizeTimeList(foundGroup?.lessonTimes).length > 0
          ? normalizeTimeList(foundGroup?.lessonTimes)
          : normalizedGroupSchedule
              .map((slot) => slot?.start_time || slot?.startTime)
              .filter(Boolean);
      const lessonLocation = foundGroup?.location || "غير محدد";
      const lessonSubject = foundGroup?.subject || "مجموعة";
      const teacherName =
        foundGroup?.teacherName || foundGroup?.teacher_name || "غير محدد";
      const lessonPrice = Number(foundGroup?.monthlyFee || 0);
      const existingScheduleSignatures = new Set(
        (existingLessons || []).map((lesson) => {
          const day = Array.isArray(lesson?.lessonDay)
            ? lesson.lessonDay[0]
            : lesson?.lessonDay;
          const time = lesson?.lessonTime || null;
          return `${day || ""}__${time || ""}`;
        }),
      );

      if (lessonDays.length > 0) {
        const lessonCount = Math.max(lessonDays.length, lessonTimes.length, 1);
        const lessonSeedTasks = Array.from(
          { length: lessonCount },
          (_, index) => {
            const day = lessonDays[index] || lessonDays[0];
            const time = lessonTimes[index] || lessonTimes[0] || null;
            const date = day ? nextOccurrenceDate(day, time) : null;
            const signature = `${day || ""}__${time || ""}`;

            if (!day || !date) return null;
            if (existingScheduleSignatures.has(signature)) return null;

            return addManualLesson({
              childId: selectedChildId,
              subject: lessonSubject,
              lessonDay: day,
              lessonTime: time,
              teacherName,
              price: lessonPrice,
              date,
              location: lessonLocation,
            });
          },
        ).filter(Boolean);

        await Promise.all(lessonSeedTasks);
      }

      if (existingExpenses.length === 0 && lessonPrice > 0) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

        await setLessonExpenseStatusByLesson({
          childId: selectedChildId,
          groupID: foundGroup?.id || null,
          month: currentMonth,
          amount: lessonPrice,
          status: "unpaid",
          paymentDate: null,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["manualLessons", selectedChildId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["lessonExpenses", selectedChildId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["nearestLessonByChild", selectedChildId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["upcomingLessonsByChild", selectedChildId],
        }),
      ]);

      toast.success("تم الانضمام للمجموعة بنجاح!");
      navigate("/parent", { replace: true });
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في الانضمام للمجموعة");
    },
  });

  const handleBack = () => {
    setGroupCode("");
    setSelectedChildId("");
    setFoundGroup(null);
    setStep("code");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <button
          onClick={() => navigate("/parent")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-semibold"
        >
          <BiArrowBack className="text-xl" />
          العودة
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          الانضمام لمجموعة
        </h1>
        <p className="text-gray-600 mb-8">
          استخدم كود المجموعة الذي أعطاه لك المعلم
        </p>

        {step === "code" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                كود المجموعة *
              </label>
              <input
                type="text"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                placeholder="GRP-ABC123XYZ"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition uppercase"
                disabled={searchMutation.isPending}
              />
              <p className="text-xs text-gray-500 mt-1">
                اكتب الكود بالحروف الكبيرة
              </p>
            </div>

            <button
              type="submit"
              disabled={searchMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {searchMutation.isPending ? "جاري البحث..." : "البحث"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinMutation.mutate();
            }}
            className="space-y-4"
          >
            {/* Group Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
              <p className="text-sm text-gray-600">المجموعة المختارة:</p>
              <h2 className="text-xl font-bold text-gray-800 mt-1">
                {foundGroup.name}
              </h2>
              <p className="text-gray-600 mt-1">المادة: {foundGroup.subject}</p>
              <p className="text-sm text-gray-500 mt-1">
                النوع: {foundGroup.type === "group" ? "مجموعة" : "حصة خصوصية"}
              </p>
            </div>

            {/* Child Selection */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                اختر الطالب *
              </label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                disabled={joinMutation.isPending}
              >
                <option value="">-- اختر طالب --</option>
                {children?.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
              {children?.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  لا يوجد طلاب. يرجى إضافة طالب أولاً.
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={joinMutation.isPending || !selectedChildId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
              >
                {joinMutation.isPending ? "جاري الانضمام..." : "الانضمام"}
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={joinMutation.isPending}
                className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold py-3 rounded-lg transition"
              >
                رجوع
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default JoinGroup;
