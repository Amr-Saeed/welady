import { createPortal } from "react-dom";

function RemovalReasonModal({
  isOpen,
  title,
  subjectLabel,
  subjectName,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) {
  if (!isOpen) return null;

  const canConfirm = reason.trim().length > 0 && !isSubmitting;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
        <p className="mb-1 text-sm text-gray-600">
          {subjectLabel}:{" "}
          <span className="font-semibold text-gray-800">{subjectName}</span>
        </p>
        <p className="mb-4 text-sm text-red-600">
          يجب كتابة سبب الإزالة قبل التأكيد.
        </p>

        <label className="mb-2 block text-sm font-semibold text-gray-700">
          سبب الإزالة
        </label>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="اكتب سبب إزالة الطالب..."
          rows={4}
          className="w-full resize-none rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-red-500 focus:outline-none"
          disabled={isSubmitting}
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-lg bg-red-600 py-2 font-bold text-white hover:bg-red-700 disabled:bg-gray-400"
          >
            {isSubmitting ? "جاري الإزالة..." : "تأكيد الإزالة"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-gray-300 py-2 font-bold text-gray-700 hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default RemovalReasonModal;
