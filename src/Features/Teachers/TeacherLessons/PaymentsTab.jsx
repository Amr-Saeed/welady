import { usePrivateLessonPayments } from "../../../Services/apiTeacherPayments";

function PaymentsTab() {
  const { data, isLoading } = usePrivateLessonPayments();

  const rows = data?.rows || [];

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

                <div
                  className={`rounded-lg px-3 py-2 text-sm font-bold ${
                    isPaid
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isPaid
                    ? "تم الدفع بواسطة ولي الأمر"
                    : "قيد انتظار دفع ولي الأمر"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        حالة الدفع يحددها ولي الأمر فقط. لا يمكن للمدرس تعديلها من هنا.
      </div>
    </div>
  );
}

export default PaymentsTab;
