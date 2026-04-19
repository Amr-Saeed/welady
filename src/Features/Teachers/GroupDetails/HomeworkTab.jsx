import { useState } from "react";
import { BiPlus } from "react-icons/bi";
import AddHomeworkModal from "./AddHomeworkModal";
import HomeworkDetailsModal from "./HomeworkDetailsModal";

function HomeworkTab({ group, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [detailsMode, setDetailsMode] = useState("edit");

  const dueDateFor = (homework) => homework.due_date || homework.dueDate;
  const childIdFor = (homework) => homework.child_id || homework.childID;
  const openDetails = (homework, mode) => {
    setDetailsMode(mode);
    setSelectedHomework(homework);
  };

  return (
    <>
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">الواجبات</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700"
          >
            <BiPlus className="text-xl" />
            إضافة واجب
          </button>
        </div>

        {group.group_homework && group.group_homework.length > 0 ? (
          <div className="space-y-4">
            {group.group_homework.map((hw) => (
              <div
                key={hw.id}
                className="rounded-lg border border-gray-200 p-4 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">
                      {hw.title}
                    </h3>
                    {hw.description ? (
                      <p className="mt-2 text-sm text-gray-600">
                        {hw.description}
                      </p>
                    ) : null}
                    {dueDateFor(hw) ? (
                      <p className="mt-2 text-xs text-orange-600">
                        موعد التسليم:{" "}
                        {new Date(dueDateFor(hw)).toLocaleDateString("ar-EG")}
                      </p>
                    ) : null}
                  </div>
                  {childIdFor(hw) ? (
                    <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                      طالب محدد
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openDetails(hw, "edit")}
                    className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    تعديل الواجب
                  </button>
                  <button
                    type="button"
                    onClick={() => openDetails(hw, "status")}
                    className="rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-100"
                  >
                    مين عمل الواجب
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <p>لا توجد واجبات</p>
            <p className="text-sm">انقر على الزر أعلاه لإضافة واجب</p>
          </div>
        )}
      </div>

      {showAddModal ? (
        <AddHomeworkModal
          groupId={group.id}
          groupMembers={group.group_members}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
          }}
        />
      ) : null}

      {selectedHomework ? (
        <HomeworkDetailsModal
          homework={selectedHomework}
          mode={detailsMode}
          groupMembers={group.group_members}
          onClose={() => setSelectedHomework(null)}
          onSaved={onRefresh}
          onDeleted={() => {
            setSelectedHomework(null);
            onRefresh();
          }}
        />
      ) : null}
    </>
  );
}

export default HomeworkTab;
