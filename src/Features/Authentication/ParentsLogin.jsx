import { FaBookOpen } from "react-icons/fa6";
import { FaBook } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  getAccountByPhone,
  loginWithPhone,
  signUpWithPhone,
  getCurrentUser,
  getAccountById,
} from "../../Services/apiAuth";

function ParentsLogin() {
  const navigate = useNavigate();

  const [step, setStep] = useState("phone"); // 'phone', 'login', 'signup'

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("father");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Check user role in DB
        const dbUser = await getAccountById(currentUser.id);
        if (dbUser && dbUser.role === "parent") {
          navigate("/parent", { replace: true });
        }
      }
    }
    checkAuth();
  }, [navigate]);

  //-----------------------Validation functions-----------------------
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
  //-----------------------End validation functions-----------------------

  //-----------------------Step 1: Check phone number-----------------------
  async function handlePhoneSubmit(e) {
    e.preventDefault();

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      console.log("📱 User entered phone:", phone);

      // Check if account exists and role
      const existingUser = await getAccountByPhone(phone);

      console.log(
        "📱 Phone check result:",
        existingUser ? "User exists" : "New user",
      );

      if (existingUser) {
        if (existingUser.role !== "parent") {
          setError("هذا الرقم مسجل كمعلم. استخدم شاشة دخول المعلمين.");
          setIsLoading(false);
          return;
        }
        // Existing parent: go to login only
        setStep("login");
      } else {
        // New user: go to signup
        setStep("signup");
      }
    } catch (err) {
      console.error("Error checking user:", err);
      setError("حدث خطأ. يرجى المحاولة مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  }
  //-----------------------End Step 1-----------------------

  //-----------------------Step 2: Login existing user-----------------------
  async function handleLogin(e) {
    e.preventDefault();

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await loginWithPhone(phone, password);

      // Navigate to dashboard
      navigate("/parent");
    } catch (err) {
      console.error("Login error:", err);
      if (err.message.includes("Invalid login credentials")) {
        setError("كلمة المرور غير صحيحة");
      } else {
        setError("حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى");
      }
    } finally {
      setIsLoading(false);
    }
  }
  //-----------------------End Step 2-----------------------

  //-----------------------Step 3: Signup new user-----------------------
  async function handleSignup(e) {
    e.preventDefault();

    const nameError = validateName(name);
    const passwordError = validatePassword(password);

    if (nameError) {
      setError(nameError);
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await signUpWithPhone(name, phone, relationship, password);

      // Navigate to dashboard
      navigate("/parent");
    } catch (err) {
      console.error("Signup error:", err);
      setError("حدث خطأ في إنشاء الحساب. يرجى المحاولة مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  }
  //-----------------------End Step 3-----------------------

  return (
    <div dir="rtl">
      <div className="flex flex-col justify-center items-center mt-6 gap-2">
        <img
          src="/welady.png"
          alt="Parents Login"
          className="w-32 h-32 object-contain"
        />
        <h2 className="text-2xl font-bold">
          {step === "phone" && "تسجيل دخول ولي الأمر"}
          {step === "login" && "أهلاً بعودتك"}
          {step === "signup" && "إنشاء حساب جديد"}
        </h2>
        <p className="text-gray-600">
          {step === "phone" && "أدخل رقم هاتفك للمتابعة"}
          {step === "login" && "أدخل كلمة المرور"}
          {step === "signup" && "أكمل بياناتك لإنشاء حسابك"}
        </p>
      </div>

      {/* Step 1: Enter Phone */}
      {step === "phone" && (
        <form
          onSubmit={handlePhoneSubmit}
          className="flex flex-col gap-4 mt-10 w-[80%] md:w-[50%] mx-auto"
        >
          <label className="font-bold">رقم الهاتف</label>
          <input
            type="text"
            placeholder="على سبيل المثال: 01012345678"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            maxLength="11"
            disabled={isLoading}
            className={`p-4 rounded-2xl border-[1px] ${
              error ? "border-red-500" : "border-[var(--main-color)]"
            } outline-none focus:!border-[var(--main-dark-color)] transition-colors duration-500 ${
              isLoading ? "opacity-50" : ""
            }`}
          />
          {error && <p className="text-red-500 text-sm -mt-2">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className={`bg-[var(--main-color)] text-white font-bold py-4 px-10 rounded-[10px] transition-colors duration-500 hover:bg-[var(--main-lite-color)] ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "جاري التحقق..." : "متابعة"}
          </button>
        </form>
      )}

      {/* Step 2: Login (Existing User) */}
      {step === "login" && (
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 mt-10 w-[80%] md:w-[50%] mx-auto"
        >
          <div className="bg-blue-50 p-3 rounded-lg mb-2">
            <p className="text-sm text-gray-700">
              📱 <span className="font-bold">{phone}</span>
            </p>
          </div>

          <label className="font-bold">كلمة المرور</label>
          <input
            type="password"
            placeholder="أدخل كلمة المرور"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            disabled={isLoading}
            className={`p-4 rounded-2xl border-[1px] ${
              error ? "border-red-500" : "border-[var(--main-color)]"
            } outline-none focus:!border-[var(--main-dark-color)] transition-colors duration-500 ${
              isLoading ? "opacity-50" : ""
            }`}
          />
          {error && <p className="text-red-500 text-sm -mt-2">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className={`bg-[var(--main-color)] text-white font-bold py-4 px-10 rounded-[10px] transition-colors duration-500 hover:bg-[var(--main-lite-color)] ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setPassword("");
              setError("");
            }}
            disabled={isLoading}
            className="text-[var(--main-color)] font-bold py-2 hover:text-[var(--main-dark-color)] transition-colors duration-500"
          >
            تغيير رقم الهاتف
          </button>
        </form>
      )}

      {/* Step 3: Signup (New User) */}
      {step === "signup" && (
        <form
          onSubmit={handleSignup}
          className="flex flex-col gap-3 mt-10 w-[80%] md:w-[50%] mx-auto"
        >
          <div className="bg-green-50 p-3 rounded-lg mb-2">
            <p className="text-sm text-gray-700">
              📱 <span className="font-bold">{phone}</span>
            </p>
          </div>

          <label className="font-bold">اسم ولي الأمر</label>
          <input
            type="text"
            placeholder="على سبيل المثال: أحمد محمد"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            disabled={isLoading}
            className={`p-4 rounded-2xl border-[1px] border-[var(--main-color)] outline-none focus:!border-[var(--main-dark-color)] transition-colors duration-500 ${
              isLoading ? "opacity-50" : ""
            }`}
          />

          <label className="font-bold">كلمة المرور</label>
          <input
            type="password"
            placeholder="اختر كلمة مرور (6 أحرف على الأقل)"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            disabled={isLoading}
            className={`p-4 rounded-2xl border-[1px] ${
              error ? "border-red-500" : "border-[var(--main-color)]"
            } outline-none focus:!border-[var(--main-dark-color)] transition-colors duration-500 ${
              isLoading ? "opacity-50" : ""
            }`}
          />
          {error && <p className="text-red-500 text-sm -mt-2">{error}</p>}

          <label className="font-bold">ماذا تقرب للطالب</label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            disabled={isLoading}
            className={`p-4 rounded-2xl border-[1px] border-[var(--main-color)] outline-none focus:!border-[var(--main-dark-color)] transition-colors duration-500 ${
              isLoading ? "opacity-50" : ""
            }`}
          >
            <option value="father">أب</option>
            <option value="mother">أم</option>
            <option value="brother">أخ</option>
            <option value="sister">أخت</option>
          </select>

          <button
            type="submit"
            disabled={isLoading}
            className={`bg-[var(--main-color)] text-white font-bold py-4 px-10 rounded-[10px] mt-2 transition-colors duration-500 hover:bg-[var(--main-lite-color)] ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setName("");
              setPassword("");
              setError("");
            }}
            disabled={isLoading}
            className="text-[var(--main-color)] font-bold py-2 hover:text-[var(--main-dark-color)] transition-colors duration-500"
          >
            تغيير رقم الهاتف
          </button>
        </form>
      )}
    </div>
  );
}

export default ParentsLogin;
