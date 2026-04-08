import { createPortal } from "react-dom";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDangerous = false,
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel}></div>

      {/* Modal */}
      <div
        className="relative mx-4 max-w-md rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        {title && (
          <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
        )}

        {/* Message */}
        <p className="mb-6 whitespace-pre-line text-gray-700">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3" dir="rtl">
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg px-4 py-2 font-semibold text-white transition-colors ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-gray-300 px-4 py-2 font-semibold text-gray-800 transition-colors hover:bg-gray-400"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
