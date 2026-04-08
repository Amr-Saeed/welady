import { useNavigate, useParams } from "react-router-dom";
import { IoChevronForward } from "react-icons/io5";
import ScheduleCard from "../Features/Parents/Children/ScheduleCard";
import HomeworkCard from "../Features/Parents/Children/HomeworkCard";
import ExpensesCard from "../Features/Parents/Children/ExpensesCard";
import AttendanceSummaryCard from "../Features/Parents/Children/AttendanceSummaryCard";
import NotificationsCard from "../Features/Parents/Children/NotificationsCard";
import { useChildById } from "../Features/Parents/useChildInfo";

function ChildDetail() {
  const navigate = useNavigate();
  const { childId } = useParams();
  const { data: child, isLoading, error } = useChildById(childId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-red-600">حدث خطأ في تحميل بيانات الطفل</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-8">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate("/parent")}
          className="flex items-center gap-2 text-gray-700 hover:text-[var(--main-color)] transition-colors"
        >
          <IoChevronForward className="text-2xl" />
          <span className="text-lg font-semibold">تفاصيل الطفل</span>
        </button>
      </div>

      {/* Child Info */}
      <div className="max-w-4xl mx-auto px-6 mt-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-1 text-center">
          {child.name}
        </h2>
        <p className="text-lg text-gray-600 mb-6 text-center">{child.grade}</p>

        {/* Detail Cards */}
        <div className="mt-6 space-y-4">
          <ScheduleCard
            onClick={() => navigate(`/parent/child/${childId}/schedule`)}
          />
          <HomeworkCard
            onClick={() => navigate(`/parent/child/${childId}/homework`)}
          />
          <ExpensesCard
            onClick={() => navigate(`/parent/child/${childId}/expenses`)}
          />
          <AttendanceSummaryCard
            onClick={() =>
              navigate(`/parent/child/${childId}/attendance-summary`)
            }
          />
          <NotificationsCard
            onClick={() => navigate(`/parent/child/${childId}/notifications`)}
          />
        </div>
      </div>
    </div>
  );
}

export default ChildDetail;
