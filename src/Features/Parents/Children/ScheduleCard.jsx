import { BsCalendar3 } from "react-icons/bs";
import { IoChevronBack } from "react-icons/io5";

function ScheduleCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      dir="rtl"
      className="w-full text-right bg-white border-2 border-gray-200 rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-50 p-3 rounded-xl">
            <BsCalendar3 className="text-3xl text-cyan-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">الجدول</h3>
            <p className="text-gray-600 text-sm mt-1">2 حصص قادمة</p>
          </div>
        </div>
        <IoChevronBack className="text-2xl text-gray-400" />
      </div>
    </button>
  );
}

export default ScheduleCard;
