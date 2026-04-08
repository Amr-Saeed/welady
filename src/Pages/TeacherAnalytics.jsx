import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BiArrowBack,
  BiBookOpen,
  BiCalendar,
  BiLineChart,
  BiMoney,
  BiRightArrowAlt,
  BiUser,
} from "react-icons/bi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";
import {
  getTeacherAnalytics,
  setTeacherStudentPaymentStatus,
} from "../Services/apiTeacherAnalytics";

const PIE_COLORS = ["#1d4ed8", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444"];

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("ar-EG")} ج.م`;
}

function toPercent(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / total) * 100);
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`rounded-lg p-2 ${accent}`}>{icon}</span>
      </div>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}

export default function TeacherAnalytics() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacherAnalytics"],
    queryFn: getTeacherAnalytics,
    retry: 1,
  });

  const summary = data?.summary || {};
  const studentDistribution = data?.studentDistribution || [];
  const incomeDistribution = data?.incomeDistribution || [];
  const gradeDistribution = data?.gradeDistribution || [];
  const monthlyIncome = data?.monthlyIncome || [];
  const subjectDistribution = data?.subjectDistribution || [];
  const dayDistribution = data?.dayDistribution || [];
  const paymentRows = data?.paymentRows || [];
  const activeMonth = data?.activeMonth || "";

  const updatePaymentMutation = useMutation({
    mutationFn: setTeacherStudentPaymentStatus,
    onSuccess: () => {
      toast.success("تم تحديث حالة الدفع");
      queryClient.invalidateQueries({ queryKey: ["teacherAnalytics"] });
    },
    onError: (error) => {
      toast.error(error?.message || "تعذر تحديث حالة الدفع");
    },
  });

  const hasIncomeData = incomeDistribution.some(
    (item) => Number(item.value || 0) > 0,
  );

  const totalStudentSplit = studentDistribution.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  const totalIncomeSplit = incomeDistribution.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  const handleSetPaymentStatus = (row, status) => {
    updatePaymentMutation.mutate({
      mode: row.mode,
      childID: row.childID,
      groupID: row.groupID,
      privateLessonID: row.privateLessonID,
      month: row.month || activeMonth,
      amount: row.amount,
      status,
    });
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        dir="rtl"
      >
        <p className="text-lg text-slate-700">جاري تحميل التحليلات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6" dir="rtl">
        <button
          onClick={() => navigate("/teacher/dashboard")}
          className="mb-4 flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
        >
          <BiArrowBack className="text-xl" />
          العودة
        </button>
        <p className="text-red-600">تعذر تحميل صفحة التحليلات</p>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dbeafe_0%,_#f8fafc_45%,_#fefce8_100%)] p-6"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <button
          onClick={() => navigate("/teacher/dashboard")}
          className="mb-4 flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
        >
          <BiArrowBack className="text-xl" />
          العودة إلى لوحة التحكم
        </button>

        <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-xl backdrop-blur">
          <div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                لوحة تحليلات المعلم
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                إحصاءات مباشرة من قاعدة البيانات: الطلاب، الدخل، الصفوف والمواد
                الأكثر نشاطاً.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="إجمالي الطلاب"
            value={summary.totalStudents || 0}
            icon={<BiUser className="text-xl text-blue-700" />}
            accent="bg-blue-100"
          />
          <StatCard
            label="عدد المجموعات"
            value={summary.groupsCount || 0}
            icon={<BiBookOpen className="text-xl text-indigo-700" />}
            accent="bg-indigo-100"
          />
          <StatCard
            label="عدد الدروس الخصوصية"
            value={summary.privateLessonsCount || 0}
            icon={<BiCalendar className="text-xl text-cyan-700" />}
            accent="bg-cyan-100"
          />
          <StatCard
            label="إجمالي الدخل المدفوع"
            value={formatCurrency(summary.totalIncome || 0)}
            icon={<BiMoney className="text-xl text-emerald-700" />}
            accent="bg-emerald-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">
              توزيع الطلاب
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studentDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {studentDistribution.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => Number(value).toLocaleString("ar-EG")}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              {studentDistribution.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <BiRightArrowAlt className="text-base text-blue-600" />
                    {item.name}
                  </span>
                  <span className="font-bold text-blue-700">
                    {toPercent(item.value, totalStudentSplit)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">
              نسبة الدخل
            </h2>
            <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p>دخل المجموعات: {summary.groupIncomePercent || 0}%</p>
              <p>دخل الدروس الخصوصية: {summary.privateIncomePercent || 0}%</p>
            </div>
            <div className="h-64">
              {hasIncomeData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeDistribution}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={95}
                    >
                      {incomeDistribution.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  لا توجد مدفوعات مسجلة حتى الآن لعرض تحليل الدخل.
                </div>
              )}
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              {incomeDistribution.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <BiRightArrowAlt className="text-base text-cyan-600" />
                    {item.name}
                  </span>
                  <span className="font-bold text-cyan-700">
                    {toPercent(item.value, totalIncomeSplit)}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">
              الصفوف الأكثر عملاً معها
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gradeDistribution}
                  margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-18}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => Number(value).toLocaleString("ar-EG")}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">
              تطور الدخل الشهري
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyIncome}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-lg font-black text-slate-900">
              تركيز المواد
            </h2>
            <div className="space-y-2">
              {subjectDistribution.length === 0 ? (
                <p className="text-sm text-slate-500">
                  لا توجد مواد كافية للتحليل.
                </p>
              ) : (
                subjectDistribution.map((item, index) => {
                  const width = summary.totalStudents
                    ? Math.max(
                        10,
                        Math.round((item.value / summary.totalStudents) * 100),
                      )
                    : 10;

                  return (
                    <div key={`${item.name}-${index}`}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">
                          {item.name}
                        </span>
                        <span className="text-slate-500">{item.value}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-black text-slate-900">
              Insights سريعة
            </h2>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="font-bold text-blue-800">أكثر صف نشاطاً</p>
                <p>{summary.topGrade || "غير متاح"}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="font-bold text-emerald-800">أكثر مادة نشاطاً</p>
                <p>{summary.topSubject || "غير متاح"}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="font-bold text-amber-800">أكثر يوم شغال فيه</p>
                <p>{summary.topDay || "غير متاح"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-bold text-slate-800">الأيام النشطة</p>
                <p>
                  {dayDistribution.map((day) => day.name).join("، ") ||
                    "غير متاح"}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-black text-slate-900">
            متابعة الدفع لكل طالب
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            الشهر الحالي: {activeMonth || "-"}
          </p>

          {paymentRows.length === 0 ? (
            <p className="text-sm text-slate-500">
              لا توجد سجلات طلاب متاحة حالياً.
            </p>
          ) : (
            <div className="space-y-3">
              {paymentRows.map((row) => {
                const isBusy = updatePaymentMutation.isPending;
                const isLocked = Boolean(row.hasRecordedStatus);

                return (
                  <div
                    key={`${row.mode}-${row.groupID || row.privateLessonID}-${row.childID}`}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-bold text-slate-800">
                        {row.childName}
                      </p>
                      <p className="text-sm text-slate-600">
                        {row.mode === "group" ? "مجموعة" : "درس خصوصي"}:{" "}
                        {row.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        المبلغ: {formatCurrency(row.amount)}
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
                          disabled={isBusy}
                          onClick={() => handleSetPaymentStatus(row, "paid")}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Paid
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSetPaymentStatus(row, "unpaid")}
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
        </section>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
          <div className="flex items-center gap-2">
            <BiLineChart className="text-lg" />
            <p>
              التحليلات تعتمد على البيانات المسجلة في قاعدة البيانات (المجموعات،
              الدروس الخصوصية، وأقساط lesson_expenses المدفوعة).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
