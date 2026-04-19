import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginTeacherWithPhone } from "../../Services/apiAuth";
import toast from "react-hot-toast";

export default function TeacherPasswordLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!password || password.length < 6) {
      setError("يرجى إدخال كلمة مرور صحيحة (6 أحرف على الأقل)");
      return;
    }
    setIsLoading(true);
    try {
      await loginTeacherWithPhone(phone, password);
      toast.success("تم تسجيل الدخول بنجاح!");
      navigate("/teacher/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "فشل تسجيل الدخول. حاول مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          تسجيل دخول المعلم
        </h1>
        <p className="mb-4 text-center text-gray-700">
          رقم الهاتف: <span className="font-mono">{phone}</span>
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            className="w-full rounded-lg border px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            dir="rtl"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 text-lg font-bold text-white hover:bg-blue-700 transition disabled:bg-gray-400"
            disabled={isLoading}
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}
