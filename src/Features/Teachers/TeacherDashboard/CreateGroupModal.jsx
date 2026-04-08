import { useState } from "react";
import toast from "react-hot-toast";
import { createGroup } from "../../../Services/apiGroups";

function CreateGroupModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("group");
  const [description, setDescription] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [location, setLocation] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const dayOptions = [
    "السبت",
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
  ];

  const toggleDay = (day) => {
    setSelectedDays((currentDays) =>
      currentDays.includes(day)
        ? currentDays.filter((value) => value !== day)
        : [...currentDays, day],
    );
  };

  const isValidTimeRange = () => {
    if (!startTime || !endTime) {
      return false;
    }

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    return endHours * 60 + endMinutes > startHours * 60 + startMinutes;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("يرجى إدخال اسم المجموعة");
      return;
    }

    if (!subject.trim()) {
      setError("يرجى إدخال المادة الدراسية");
      return;
    }

    if (selectedDays.length === 0) {
      setError("يرجى اختيار يوم واحد على الأقل");
      return;
    }

    if (!startTime || !endTime) {
      setError("يرجى إدخال وقت البداية والنهاية");
      return;
    }

    if (!isValidTimeRange()) {
      setError("وقت النهاية يجب أن يكون بعد وقت البداية");
      return;
    }

    if (monthlyFee === "" || Number(monthlyFee) < 0) {
      setError("يرجى إدخال السعر الشهري بشكل صحيح");
      return;
    }

    setIsLoading(true);

    try {
      await createGroup(name, subject, type, description, {
        lessonDays: selectedDays,
        lessonTimes: selectedDays.map(() => startTime),
        lessonTimesEnds: selectedDays.map(() => endTime),
        location,
        monthlyFee: Number(monthlyFee || 0),
      });
      toast.success("تم إنشاء المجموعة بنجاح!");
      onSuccess();
    } catch (err) {
      const message =
        err?.message ||
        err?.details ||
        err?.error_description ||
        "خطأ في إنشاء المجموعة";
      setError(message);
      toast.error(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-50 p-3 md:items-center md:p-4"
      dir="rtl"
    >
      <div className="my-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-2xl md:p-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          إنشاء مجموعة جديدة
        </h2>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              اسم المجموعة *
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="مثال: مجموعة الرياضيات - المستوى الأول"
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              المادة الدراسية *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="مثال: رياضيات، لغة عربية"
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              نوع المجموعة
            </label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            >
              <option value="group">مجموعة (عدة طلاب)</option>
              <option value="private">حصة خصوصية (طالب واحد)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              الوصفة (اختياري)
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="اكتب وصفة عن المجموعة والأهداف..."
              rows="3"
              className="w-full resize-none rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              المكان (اختياري)
            </label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="مثال: المعادي - شارع 9"
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              السعر الشهري *
            </label>
            <input
              type="number"
              min="0"
              value={monthlyFee}
              onChange={(event) => setMonthlyFee(event.target.value)}
              placeholder="مثال: 300"
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              أيام الحصة *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {dayOptions.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    selectedDays.includes(day)
                      ? "border-purple-600 bg-purple-50 text-purple-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-purple-300"
                  }`}
                  disabled={isLoading}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                وقت البداية *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                وقت النهاية *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                min={startTime || undefined}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-purple-600 py-2 font-bold text-white transition hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isLoading ? "جاري الإنشاء..." : "إنشاء"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border-2 border-gray-300 py-2 font-bold text-gray-700 transition hover:border-gray-400"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateGroupModal;
