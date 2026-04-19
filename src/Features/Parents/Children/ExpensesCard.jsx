import { BiDollar } from "react-icons/bi";
import { IoChevronBack } from "react-icons/io5";

function ExpensesCard({
  onClick,
  weekLabel = "0 ج.م",
  monthLabel = "0 ج.م",
  unpaidLabel = "0 مصروفات لم تُدفع",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      dir="rtl"
      className="w-full text-right bg-white border-2 border-gray-200 rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-3 rounded-xl">
            <BiDollar className="text-3xl text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">المصروفات</h3>
        </div>
        <IoChevronBack className="text-2xl text-gray-400" />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">هذا الأسبوع:</span>
          <span className="font-bold text-gray-800">{weekLabel}</span>
        </div>
        <div className="flex items-center gap-2 ">
          <span className="text-gray-600">هذا الشهر:</span>
          <span className="font-bold text-gray-800">{monthLabel}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-red-600 font-semibold">{unpaidLabel}</span>
        </div>
      </div>
    </button>
  );
}

export default ExpensesCard;
