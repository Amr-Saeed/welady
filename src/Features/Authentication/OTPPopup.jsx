import { useState, useEffect } from "react";
import { FaCopy, FaCheck } from "react-icons/fa";

function OTPPopup({ otp, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div
        className="bg-white rounded-2xl p-8 max-w-md w-[90%] shadow-2xl animate-slideUp"
        dir="rtl"
      >
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              رمز التحقق الخاص بك
            </h3>
            <p className="text-gray-600 mb-6">تم إرسال الرمز بنجاح</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="text-4xl font-bold text-[var(--main-color)] tracking-widest mb-4 font-mono">
              {otp}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-[var(--main-color)] text-white rounded-lg hover:bg-[var(--main-dark-color)] transition-colors duration-300 font-semibold"
            >
              {copied ? (
                <>
                  <FaCheck className="text-lg" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <FaCopy className="text-lg" />
                  <span>نسخ الرمز</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-300 font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default OTPPopup;
