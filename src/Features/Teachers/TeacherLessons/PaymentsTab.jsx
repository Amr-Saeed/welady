import toast from "react-hot-toast";
import {
  usePrivateLessonPayments,
  useSetTeacherPaymentStatus,
} from "../../../Services/apiTeacherPayments";
import { addInAppNotification } from "../../../Services/apiNotifications";

function PaymentsTab() {
  const { data, isLoading } = usePrivateLessonPayments();
  const setStatusMutation = useSetTeacherPaymentStatus([
    ["privateLessonPayments"],
    ["teacherChildren"],
  ]);

  const rows = data?.rows || [];

  const handleStatus = async (row, status) => {
    try {
      await setStatusMutation.mutateAsync({
        mode: "private_lesson",
        childID: row.childID,
        privateLessonID: row.privateLessonID,
        amount: row.amount,
        month: row.month,
        status,
      });

      addInAppNotification({
        childId: row.childID,
        type: "payment_status_updated",
        title: "تحديث حالة الدفع",
        message: `تم تسجيل حالة الدفع في ${row.title}: ${status === "paid" ? "تم الدفع" : "لم يتم الدفع"}`,
        dedupeKey: `payment-status-private-${row.privateLessonID}-${row.childID}-${row.month}`,
        payload: {
          mode: "private_lesson",
          privateLessonId: row.privateLessonID,
          month: row.month,
          status,
          amount: row.amount,
        },
      });

      toast.success("تم تحديث حالة الدفع");
    } catch (error) {
      toast.error(error?.message || "تعذر تحديث حالة الدفع");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow">
        <p className="text-center text-gray-600">جاري تحميل المدفوعات...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          مدفوعات الدروس الخصوصية
        </h2>
        <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
          شهر: {data?.month || "-"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          لا توجد دروس خصوصية حالياً
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isPaid = row.status === "paid";
            const disabled = setStatusMutation.isPending;
            const isLocked = Boolean(row.hasRecordedStatus);

            return (
              <div
                key={row.key}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-base font-bold text-gray-800">
                    {row.childName}
                  </p>
                  <p className="text-sm text-gray-600">{row.title}</p>
                  <p className="text-xs text-gray-500">
                    القيمة: {row.amount} جنيه
                  </p>
                </div>

                {isLocked ? (
                  <div className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-blue-700">
                    تم تسجيل الحالة
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStatus(row, "paid")}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Paid
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStatus(row, "unpaid")}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Not Paid
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PaymentsTab;
