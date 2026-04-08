import { formatDayName, formatScheduleRange } from "./groupDetailsUtils";

function OverviewTab({ group }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-800">الإحصائيات</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-gray-700">عدد الطلاب</span>
            <span className="text-3xl font-bold text-purple-600">
              {group.group_members?.length || 0}
            </span>
          </div>
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-gray-700">الحصص الأسبوعية</span>
            <span className="text-3xl font-bold text-blue-600">
              {group.group_schedule?.length || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">الواجبات</span>
            <span className="text-3xl font-bold text-green-600">
              {group.group_homework?.length || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-800">جدول الحصص</h2>
        {group.group_schedule && group.group_schedule.length > 0 ? (
          <div className="space-y-2">
            {group.group_schedule.map((schedule) => (
              <div key={schedule.id} className="rounded-lg bg-purple-50 p-3">
                <p className="font-semibold text-gray-800">
                  {formatDayName(schedule.day_of_week)}
                </p>
                <p className="text-sm text-gray-600">
                  {formatScheduleRange(schedule.start_time, schedule.end_time)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">لم يتم تحديد جدول بعد</p>
        )}
      </div>
    </div>
  );
}

export default OverviewTab;
