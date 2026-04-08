import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { addChild } from "../../Services/apiChildren";
import { useParentProfile } from "../../Features/Parents/useParentProfile";
import Button from "../../Ui/Button";

function AddChild() {
  const navigate = useNavigate();
  const { data: parentProfile } = useParentProfile();
  const [childName, setChildName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [gradeError, setGradeError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const gradeOptions = [
    { value: "", label: "اختر الصف الدراسي" },
    { value: "الصف الأول الإبتدائي", label: "الصف الأول الإبتدائي" },
    { value: "الصف الثاني الإبتدائي", label: "الصف الثاني الإبتدائي" },
    { value: "الصف الثالث الإبتدائي", label: "الصف الثالث الإبتدائي" },
    { value: "الصف الرابع الإبتدائي", label: "الصف الرابع الإبتدائي" },
    { value: "الصف الخامس الإبتدائي", label: "الصف الخامس الإبتدائي" },
    { value: "الصف السادس الإبتدائي", label: "الصف السادس الإبتدائي" },
    { value: "الصف السابع (أولي إعدادي)", label: "الصف السابع (أولي إعدادي)" },
    {
      value: "الصف الثامن (تانية إعدادي)",
      label: "الصف الثامن (تانية إعدادي)",
    },
    {
      value: "الصف التاسع (تالتة إعدادي)",
      label: "الصف التاسع (تالتة إعدادي)",
    },
    { value: "الصف العاشر (أولي ثانوي)", label: "الصف العاشر (أولي ثانوي)" },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  //-----------------------Validation functions-----------------------
  function validateChildName(name) {
    if (!name.trim()) {
      return "يرجى إدخال اسم الطفل";
    }
    if (name.trim().length < 3) {
      return "يجب أن يكون الاسم 3 أحرف على الأقل";
    }
    if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(name)) {
      return "يجب أن يحتوي الاسم على أحرف فقط";
    }
    return null;
  }

  function validateGrade(grade) {
    if (!grade) {
      return "يرجى اختيار الصف الدراسي";
    }
    return null;
  }
  //-----------------------End validation functions-----------------------

  async function handleSubmit(e) {
    e.preventDefault();

    // Clear previous errors
    setNameError("");
    setGradeError("");
    setError("");

    // Validate all fields
    const nameValidationError = validateChildName(childName);
    const gradeValidationError = validateGrade(gradeLevel);

    // Set all errors at once
    if (nameValidationError) {
      setNameError(nameValidationError);
    }

    if (gradeValidationError) {
      setGradeError(gradeValidationError);
    }

    // If any errors exist, stop submission
    if (nameValidationError || gradeValidationError) {
      return;
    }
    // Check if parent profile is loaded
    if (!parentProfile?.id) {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى");
      return;
    }

    try {
      setIsLoading(true);

      // Add child to database
      const childData = await addChild({
        parentId: parentProfile.id,
        name: childName,
        grade: gradeLevel,
        age: null,
      });

      console.log("✅ Child added:", childData);

      // Show success toast
      toast.success("تم إضافة الطفل بنجاح!");

      // Navigate to success page with child data
      navigate("/parent/child-success", {
        state: { childData },
        replace: true,
      });
    } catch (err) {
      console.error("Error adding child:", err);
      toast.error("حدث خطأ. يرجى المحاولة مرة أخرى");
      setError("حدث خطأ. يرجى المحاولة مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div dir="rtl" className="p-6">
      <h2 className="text-2xl font-bold mb-4">إضافة طفل جديد</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="font-bold">اسم الطفل</label>
        <input
          type="text"
          placeholder="على سبيل المثال: أحمد محمد"
          value={childName}
          onChange={(e) => {
            setChildName(e.target.value);
            setNameError("");
            setError("");
          }}
          disabled={isLoading}
          className={`p-4 rounded-2xl border-[1px] ${
            nameError ? "border-red-500" : "border-[var(--main-color)]"
          } outline-none focus:!border-[var(--main-dark-color)] transition-colors duration-500 ${
            isLoading ? "opacity-50" : ""
          }`}
        />
        {nameError && <p className="text-red-500 text-sm -mt-2">{nameError}</p>}

        <label className="font-bold">الصف الدراسي</label>
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => !isLoading && setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoading}
            className={`w-full p-4 rounded-2xl border-[1px] ${
              gradeError ? "border-red-500" : "border-[var(--main-color)]"
            } outline-none focus:!border-[var(--main-dark-color)] transition-colors duration-500 ${
              isLoading ? "opacity-50" : ""
            } text-right flex justify-between items-center bg-white`}
          >
            <span className={gradeLevel ? "text-black" : "text-gray-400"}>
              {gradeLevel || "اختر الصف الدراسي"}
            </span>
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border-[1px] border-[var(--main-color)] rounded-2xl shadow-lg max-h-60 overflow-y-auto">
              {gradeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setGradeLevel(option.value);
                    setGradeError("");
                    setError("");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-right p-4 hover:bg-[var(--main-color)] hover:text-white transition-colors duration-200 ${
                    gradeLevel === option.value
                      ? "bg-[var(--main-lite-color)] text-white"
                      : ""
                  } ${option.value === "" ? "text-gray-400" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {gradeError && (
          <p className="text-red-500 text-sm -mt-2">{gradeError}</p>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button
          type="submit"
          disabled={isLoading}
          className={`bg-[var(--main-color)] text-white font-bold py-4 px-10 rounded-[10px] mt-2 transition-colors duration-500 hover:bg-[var(--main-lite-color)] ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? "جاري الحفظ وإنشاء الكود..." : "حفظ وإنشاء كود الطفل"}
        </Button>
      </form>
      <Button
        type="button"
        onClick={() => navigate("/parent")}
        className="mt-4 bg-gray-500 text-white font-bold py-4 px-10 rounded-[10px] transition-colors duration-500 hover:bg-gray-600 w-full"
      >
        الرجوع لإضافة طفل
      </Button>
      <div className="mt-6 bg-[rgba(124,178,231,0.5)] border-[1px] border-[rgb(209,217,224)] p-4 rounded-lg">
        <p className="text-black text-bold">
          سيتم إنشاء كود فريد لطفلك لمشاركته مع المدرس
        </p>
      </div>
    </div>
  );
}

export default AddChild;
