import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BiChalkboard } from "react-icons/bi";
import {
  getAccountByPhone,
  loginTeacherWithPhone,
  signUpTeacherWithPhone,
  getCurrentUser,
  getAccountById,
} from "../../Services/apiAuth";
import toast from "react-hot-toast";

function TeachersLogin() {
  const navigate = useNavigate();

  const [step, setStep] = useState("phone"); // 'phone', 'login', 'signup'

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Check user role in DB
        const dbUser = await getAccountById(currentUser.id);
        if (dbUser && dbUser.role === "teacher") {
          navigate("/teacher/dashboard", { replace: true });
        }
      }
    }
    checkAuth();
  }, [navigate]);

  // ----- Validation functions -----
  function validatePhone(phoneNumber) {
    if (!phoneNumber.trim()) {
      return "يرجى إدخال رقم الهاتف";
    }
    if (!/^01[0-2,5]{1}[0-9]{8}$/.test(phoneNumber)) {
      return "يجب أن يكون رقم الهاتف 11 رقم ويبدأ بـ 01";
    }
    return null;
  }

  function validateName(nameValue) {
    if (!nameValue.trim()) {
      return "يرجى إدخال الاسم";
    }
    if (nameValue.trim().length < 3) {
      return "يجب أن يكون الاسم 3 أحرف على الأقل";
    }
    if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(nameValue)) {
      return "يجب أن يحتوي الاسم على أحرف فقط";
    }
    return null;
  }

  function validatePassword(passwordValue) {
    if (!passwordValue) {
      return "يرجى إدخال كلمة المرور";
    }
    if (passwordValue.length < 6) {
      return "يجب أن تكون كلمة المرور 6 أحرف على الأقل";
    }
    return null;
  }

  function validateSpecialization(spec) {
    if (!spec.trim()) {
      return "يرجى إدخال التخصص";
    }
    if (spec.trim().length < 2) {
      return "يجب أن يكون التخصص حرفين على الأقل";
    }
    return null;
  }

  // ----- Step 1: Check phone number -----
  async function handlePhoneSubmit(e) {
    e.preventDefault();
    setError("");

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setIsLoading(true);
    // DEBUG: Show what phone is being checked
    console.log("Checking phone:", phone);
    try {
      const account = await getAccountByPhone(phone);
      console.log("Account found:", account);

      if (account) {
        if (account.role !== "teacher") {
          setError("هذا الرقم مسجل كولي أمر. استخدم شاشة دخول أولياء الأمور.");
          setIsLoading(false);
          return;
        }
        // Existing teacher: switch to login step
        setStep("login");
        return;
      } else {
        // New user: go to signup
        setStep("signup");
      }
    } catch (err) {
      setError("حدث خطأ أثناء التحقق من الرقم");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // ----- Step 2: Login existing teacher -----
  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);
    try {
      await loginTeacherWithPhone(phone, password);
      toast.success("تم تسجيل الدخول بنجاح!");
      navigate("/teacher/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "فشل تسجيل الدخول. حاول مرة أخرى");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // ----- Step 3: Sign up new teacher -----
  async function handleSignUp(e) {
    e.preventDefault();
    setError("");

    const nameError = validateName(name);
    const passwordError = validatePassword(password);
    const specError = validateSpecialization(specialization);

    if (nameError) {
      setError(nameError);
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (specError) {
      setError(specError);
      return;
    }

    setIsLoading(true);
    try {
      await signUpTeacherWithPhone(name, phone, specialization, password);
      toast.success("تم التسجيل بنجاح! جاري إعادة التوجيه...");
      navigate("/teacher/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "فشل التسجيل. حاول مرة أخرى");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // ----- Back button handler -----
  function handleBack() {
    setPhone("");
    setPassword("");
    setName("");
    setSpecialization("");
    setError("");
    setStep("phone");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BiChalkboard className="text-4xl text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">تسجيل المعلمين</h1>
          <p className="text-gray-600 mt-2">إدارة الحصص والدروس بسهولة</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Phone Step */}
        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                يجب أن يكون الرقم 11 خانة ويبدأ بـ 01
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {isLoading ? "جاري البحث..." : "التالي"}
            </button>
          </form>
        )}

        {/* Login Step */}
        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {isLoading ? "جاري الدخول..." : "دخول"}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold py-3 rounded-lg transition"
            >
              رجوع
            </button>
          </form>
        )}

        {/* Sign Up Step */}
        {step === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                الاسم الكامل
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أحمد محمد"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                التخصص
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="مثال: رياضيات، لغة عربية"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                يجب أن تكون 6 أحرف على الأقل
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {isLoading ? "جاري التسجيل..." : "تسجيل جديد"}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold py-3 rounded-lg transition"
            >
              رجوع
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>للوالدين؟</p>
          <button
            type="button"
            onClick={() => navigate("/login/parents")}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            دخول الوالدين
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeachersLogin;
