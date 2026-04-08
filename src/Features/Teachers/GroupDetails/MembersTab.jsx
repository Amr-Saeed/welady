import { BiMinusCircle, BiPlus } from "react-icons/bi";

function MembersTab({ group, onAddStudent, onOpenAnalytics, onRemoveStudent }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-xl font-bold text-gray-800">الطلاب المسجلون</h2>
        <button
          onClick={onAddStudent}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 font-semibold text-white transition hover:from-purple-700 hover:to-blue-700"
        >
          <BiPlus className="text-lg" />
          إضافة طالب
        </button>
      </div>

      {group.group_members && group.group_members.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  اسم الطالب
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  الكود
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  ولي الأمر (رقم الهاتف)
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  تاريخ الانضمام
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  التحليلات
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {group.group_members.map((member) => (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4 text-gray-800">
                    {member.children?.name}
                  </td>
                  <td className="px-4 py-4 font-mono text-gray-600">
                    {member.children?.studentCode || "-"}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">
                        {member.parents?.phoneNumber || "-"}
                      </span>
                      {member.parents?.name && (
                        <span className="text-xs text-gray-500">
                          {member.parents.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {new Date(member.joined_at).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() =>
                        onOpenAnalytics?.(member.child_id || member.childID)
                      }
                      className="rounded-lg bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200"
                    >
                      عرض التحليلات
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => onRemoveStudent?.(member)}
                      className="rounded-lg flex items-center bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                    >
                      <BiMinusCircle className="mr-1 inline text-xl" />
                      إزالة الطالب
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500">
          لا يوجد طلاب مسجلون بعد
        </p>
      )}
    </div>
  );
}

export default MembersTab;
