import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBook } from "react-icons/fa6";
import {
  verifyOTP,
  checkUserExists,
  createUserProfile,
  loginWithPhone,
} from "../../Services/apiAuth";
import OTPPopup from "./OTPPopup";

function ParentsOTP() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [currentOTP, setCurrentOTP] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Get user data and OTP from navigation state
  const { name, phone, relationship, otp: generatedOTP } = location.state || {};

  // Show "sending" message, then popup after delay (dev mode only)
  useEffect(() => {
    if (import.meta.env.VITE_DEV_MODE === "true" && generatedOTP) {
      // Show sending message for 2 seconds
      setSendingMessage(true);
      setCurrentOTP(generatedOTP);

      const timer = setTimeout(() => {
        setSendingMessage(false);
        setShowPopup(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [generatedOTP]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [resendCountdown]);

  // Resend OTP handler
  const handleResendOTP = async () => {
    if (!canResend || !phone) return;

    try {
      setCanResend(false);
      setResendCountdown(60);
      setSendingMessage(true);

      // Send new OTP
      const result = await loginWithPhone(phone);

      if (result?.otp) {
        setCurrentOTP(result.otp);

        // Show sending message then popup
        setTimeout(() => {
          setSendingMessage(false);
          setShowPopup(true);
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Resend OTP error:", error);
      setError("حدث خطأ في إعادة إرسال الرمز. يرجى المحاولة مرة أخرى");
      setCanResend(true);
      setResendCountdown(0);
    }
  };

  async function handleVerify(e) {
    e.preventDefault();

    // Validate OTP
    if (!otp || otp.length !== 6) {
      setError("يرجى إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }

    // Check if we have user data
    if (!name || !phone || !relationship) {
      setError("بيانات المستخدم مفقودة. يرجى العودة لصفحة تسجيل الدخول");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      // Step 1: Verify OTP
      console.log("🔐 Verifying OTP...");
      const result = await verifyOTP(phone, otp);
      console.log("✅ OTP verified:", result);

      // Step 2: Check if user exists in database
      console.log("👤 Checking if user exists...");
      const existingUser = await checkUserExists(result.user.id);

      if (!existingUser) {
        // Step 3: New user - create profile in database
        console.log("📝 Creating new user profile...");
        await createUserProfile(result.user.id, name, phone, relationship);
        console.log("✅ User profile created successfully");
      } else {
        console.log("✅ Existing user logged in");
      }

      // Step 4: Store session in localStorage (persistent for life)
      if (import.meta.env.VITE_DEV_MODE === "true") {
        localStorage.setItem("dev_session", JSON.stringify(result));
      }

      // Step 5: Navigate to parent dashboard
      navigate("/parent");
    } catch (err) {
      console.error("❌ Verification error:", err);
      setError(err.message || "حدث خطأ في التحقق. يرجى المحاولة مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div dir="rtl">
      {/* OTP Popup for dev mode */}
      {showPopup && currentOTP && (
        <OTPPopup otp={currentOTP} onClose={() => setShowPopup(false)} />
      )}

      {/* Sending message overlay */}
      {sendingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-pulse">
            <div className="w-16 h-16 border-4 border-[var(--main-color)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-700">
              جاري إرسال رمز التحقق...
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-center items-center mt-6 gap-2">
        <img
          src="/welady.png"
          alt="Parents Login"
          className="w-32 h-32 object-contain"
        />
        <h2 className="text-2xl font-bold">تأكيد رقم الهاتف</h2>
        <p>أدخل رمز التحقق المرسل إلى هاتفك</p>
      </div>
      <form
        onSubmit={handleVerify}
        className="flex flex-col gap-4 mt-10 w-[80%] md:w-[50%] mx-auto"
      >
        <input
          type="text"
          placeholder="رمز التحقق"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value);
            if (error) setError("");
          }}
          disabled={isLoading}
          className={`p-4 rounded-2xl border-[1px] ${
            error ? "border-red-500" : "border-[var(--main-color)]"
          } outline-none focus:!border-[var(--main-dark-color)] transition-colors duration-500 text-center text-2xl tracking-widest ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          maxLength="6"
        />
        {error && (
          <p className="text-red-500 text-sm text-center -mt-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className={`bg-[var(--main-color)] text-white font-bold py-4 px-10 rounded-[10px] mb-2 transition-colors duration-500 hover:bg-[var(--main-lite-color)] ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? "جاري التحقق..." : "تحقق"}
        </button>

        <div className="flex gap-4 justify-between items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isLoading}
            className={`text-[var(--main-color)] font-bold py-2 transition-colors duration-500 hover:text-[var(--main-dark-color)] ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            العودة لتسجيل الدخول
          </button>

          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!canResend || isLoading}
            className={`text-[var(--main-color)] font-bold py-2 transition-colors duration-500 hover:text-[var(--main-dark-color)] flex items-center gap-2 ${
              !canResend || isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            إعادة إرسال الرمز
            {!canResend && (
              <span className="text-sm bg-gray-200 px-2 py-1 rounded-lg">
                {resendCountdown}ث
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ParentsOTP;

//! this is the otp with six input fields, if you want to use it, just replace the code above with this one and make sure to import useRef from react and add the inputRefs const at the beginning of the component

// import { useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import { FaBook } from "react-icons/fa6";

// function ParentsOTP() {
//   const [otp, setOtp] = useState(["", "", "", "", "", ""]);
//   const inputRefs = useRef([]);

//   const handleChange = (index, value) => {
//     // Only allow numbers
//     if (isNaN(value)) return;

//     const newOtp = [...otp];
//     // Take only the last character if multiple are pasted
//     newOtp[index] = value.slice(-1);
//     setOtp(newOtp);

//     // Auto-focus next input
//     if (value && index < 5) {
//       inputRefs.current[index + 1]?.focus();
//     }
//   };

//   const handleKeyDown = (index, e) => {
//     // Move to previous input on backspace if current is empty
//     if (e.key === "Backspace" && !otp[index] && index > 0) {
//       inputRefs.current[index - 1]?.focus();
//     }
//   };

//   const handlePaste = (e) => {
//     e.preventDefault();
//     const pastedData = e.clipboardData.getData("text/plain").slice(0, 6);
//     const newOtp = [...otp];

//     pastedData.split("").forEach((char, index) => {
//       if (index < 6 && !isNaN(char)) {
//         newOtp[index] = char;
//       }
//     });

//     setOtp(newOtp);

//     // Focus the next empty input or the last one
//     const nextIndex = Math.min(pastedData.length, 5);
//     inputRefs.current[nextIndex]?.focus();
//   };
//   return (
//     <div dir="rtl">
//       <div className="flex flex-col justify-center items-center mt-6 gap-2">
//         {/* <FaBook className="text-[var(--main-color)] text-9xl" /> */}
//         <img
//           src="/welady.png"
//           alt="Parents Login"
//           className="w-32 h-32 object-contain"
//         />
//         <h2 className="text-2xl font-bold">تأكيد رقم الهاتف</h2>
//         <p>أدخل رمز التحقق المرسل إلى هاتفك</p>
//       </div>
//       <form
//         onSubmit={(e) => e.preventDefault()}
//         className="flex flex-col gap-4 mt-10 w-[80%] md:w-[50%] mx-auto"
//       >
//         <div className="flex gap-3 justify-center mb-8" dir="ltr">
//           {otp.map((digit, index) => (
//             <input
//               key={index}
//               ref={(el) => (inputRefs.current[index] = el)}
//               type="text"
//               inputMode="numeric"
//               maxLength={1}
//               value={digit}
//               onChange={(e) => handleChange(index, e.target.value)}
//               onKeyDown={(e) => handleKeyDown(index, e)}
//               onPaste={handlePaste}
//               className="w-12 h-14 text-center text-2xl font-semibold border-2 border-[var(--main-color)] rounded-lg focus:border-[var(--main-dark-color)] focus:ring-2 focus:ring-[var(--main-verylite-color)] focus:outline-none transition-all"
//             />
//           ))}
//         </div>
//         <button
//           type="submit"
//           className="bg-[var(--main-color)] text-white font-bold py-4 px-10 rounded-[10px] mb-2 transition-colors duration-500 hover:bg-[var(--main-lite-color)]"
//         >
//           تحقق
//         </button>
//         <button
//           type="button"
//           className="text-[var(--main-color)] font-bold py-2 transition-colors duration-500 hover:text-[var(--main-lite-color)]"
//         >
//           إعادة إرسال الرمز
//         </button>
//       </form>
//     </div>
//   );
// }

// export default ParentsOTP;
