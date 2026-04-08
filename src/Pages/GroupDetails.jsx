import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BiArrowBack, BiCopy, BiTrash } from "react-icons/bi";
import toast from "react-hot-toast";
import {
  deleteGroup,
  getGroupById,
  removeMemberFromGroup,
} from "../Services/apiGroups";
import { addInAppNotification } from "../Services/apiNotifications";
import { createEnrollmentRemoval } from "../Services/apiEnrollmentRemovals";
import OverviewTab from "../Features/Teachers/GroupDetails/OverviewTab";
import MembersTab from "../Features/Teachers/GroupDetails/MembersTab";
import ScheduleTab from "../Features/Teachers/GroupDetails/ScheduleTab";
import HomeworkTab from "../Features/Teachers/GroupDetails/HomeworkTab";
import AttendanceTab from "../Features/Teachers/GroupDetails/AttendanceTab";
import PaymentsTab from "../Features/Teachers/GroupDetails/PaymentsTab";
import AddStudentModal from "../Features/Teachers/GroupDetails/AddStudentModal";
import ConfirmModal from "../Ui/ConfirmModal";
import RemovalReasonModal from "../Ui/RemovalReasonModal";

async function copyGroupCode(groupCode) {
  if (!groupCode) {
    toast.error("لا يوجد كود للمجموعة");
    return;
  }

  try {
    await navigator.clipboard.writeText(groupCode);
    toast.success("تم نسخ كود المجموعة");
  } catch (error) {
    console.error(error);
    toast.error("تعذر نسخ كود المجموعة");
  }
}

function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removeReason, setRemoveReason] = useState("");

  const {
    data: group,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["groupDetails", groupId],
    queryFn: () => getGroupById(groupId),
    retry: 1,
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      toast.success("تم إلغاء المجموعة");
      navigate("/teacher/dashboard", { replace: true });
    },
    onError: (mutationError) => {
      toast.error(mutationError?.message || "خطأ في إلغاء المجموعة");
      console.error(mutationError);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, childId }) =>
      removeMemberFromGroup(targetGroupId, childId),
    onSuccess: () => {
      toast.success("تمت إزالة الطالب من المجموعة");
      refetch();
    },
    onError: (mutationError) => {
      toast.error(mutationError?.message || "تعذر إزالة الطالب من المجموعة");
      console.error(mutationError);
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-lg">جاري التحميل...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/teacher/dashboard")}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <BiArrowBack className="text-xl" />
          العودة
        </button>
        <p className="text-red-600">خطأ في تحميل بيانات المجموعة</p>
      </div>
    );
  }

  const handleDeleteGroup = () => {
    setShowDeleteConfirm(true);
  };

  const handleOpenRemoveMemberModal = (member) => {
    setMemberToRemove(member);
    setRemoveReason("");
    setShowRemoveMemberModal(true);
  };

  const handleConfirmRemoveMember = async () => {
    const childId = memberToRemove?.child_id || memberToRemove?.childID;
    if (!group?.id || !childId) return;

    const reason = removeReason.trim();
    if (!reason) {
      toast.error("يجب كتابة سبب الإزالة");
      return;
    }

    try {
      await removeMemberMutation.mutateAsync({ groupId: group.id, childId });

      await createEnrollmentRemoval({
        childId,
        parentId: memberToRemove?.children?.parentID,
        removalType: "group",
        groupId: group.id,
        reason,
        metadata: {
          groupName: group.name,
          subject: group.subject,
        },
      });

      addInAppNotification({
        childId,
        type: "group_member_removed",
        title: "إزالة من المجموعة",
        message: `تمت إزالة ${memberToRemove?.children?.name || "الطالب"} من مجموعة ${group.name}. السبب: ${reason}`,
        dedupeKey: `group-member-removed-${group.id}-${childId}-${reason}`,
        payload: {
          groupId: group.id,
          childId,
          reason,
        },
      });

      setShowRemoveMemberModal(false);
      setMemberToRemove(null);
      setRemoveReason("");
    } catch (mutationError) {
      console.error(mutationError);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <button
            onClick={() => navigate("/teacher/dashboard")}
            className="mb-4 flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
          >
            <BiArrowBack className="text-xl" />
            العودة إلى لوحة التحكم
          </button>

          <div className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-lg">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5 text-white md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/75">
                    كود المجموعة
                  </p>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="break-all font-mono text-2xl font-bold leading-tight md:text-3xl">
                      {group.group_code}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyGroupCode(group.group_code)}
                      className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
                      title="نسخ الكود"
                    >
                      <BiCopy className="text-base" />
                      نسخ
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs text-white/75">النوع</p>
                  <p className="mt-1 font-semibold">
                    {group.type === "group" ? "مجموعة" : "حصة خصوصية"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={deleteGroupMutation.isPending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
              >
                <BiTrash className="text-base" />
                إلغاء هذه المجموعة
              </button>
            </div>

            <div className="space-y-4 p-5 md:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500">اسم المجموعة</p>
                  <h1 className="mt-1 break-words text-2xl font-bold leading-tight text-gray-800 md:text-3xl">
                    {group.name}
                  </h1>
                  <p className="mt-2 text-gray-600">المادة: {group.subject}</p>
                </div>
              </div>

              {group.description ? (
                <p className="border-t pt-4 text-gray-700">
                  {group.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow">
          {[
            { id: "overview", label: "نظرة عامة" },
            {
              id: "members",
              label: `الطلاب (${group.group_members?.length || 0})`,
            },
            {
              id: "schedule",
              label: `الجدول (${group.group_schedule?.length || 0})`,
            },
            {
              id: "homework",
              label: `الواجبات (${group.group_homework?.length || 0})`,
            },
            { id: "attendance", label: "الحضور" },
            { id: "payments", label: "المدفوعات" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition ${activeTab === tab.id ? "bg-purple-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? <OverviewTab group={group} /> : null}
        {activeTab === "members" ? (
          <MembersTab
            group={group}
            onAddStudent={() => setShowAddStudentModal(true)}
            onOpenAnalytics={(childId) =>
              navigate(`/teacher/group/${groupId}/student/${childId}/analytics`)
            }
            onRemoveStudent={handleOpenRemoveMemberModal}
          />
        ) : null}
        {activeTab === "schedule" ? (
          <ScheduleTab group={group} onRefresh={refetch} />
        ) : null}
        {activeTab === "homework" ? (
          <HomeworkTab group={group} onRefresh={refetch} />
        ) : null}
        {activeTab === "attendance" ? (
          <AttendanceTab group={group} onRefresh={refetch} />
        ) : null}
        {activeTab === "payments" ? <PaymentsTab group={group} /> : null}
      </div>

      <AddStudentModal
        isOpen={showAddStudentModal}
        groupId={groupId}
        existingChildIds={(group.group_members || [])
          .map((member) => member.child_id || member.childID)
          .filter(Boolean)}
        onClose={() => setShowAddStudentModal(false)}
        onSuccess={() => {
          refetch();
          setShowAddStudentModal(false);
        }}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="إلغاء المجموعة"
        message={`هل تريد إلغاء هذه المجموعة؟\n\n${group.name}`}
        confirmText="تأكيد"
        cancelText="إلغاء"
        isDangerous={true}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteGroupMutation.mutate(group.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <RemovalReasonModal
        isOpen={showRemoveMemberModal}
        title="إزالة طالب من المجموعة"
        subjectLabel="الطالب"
        subjectName={memberToRemove?.children?.name || "-"}
        reason={removeReason}
        onReasonChange={setRemoveReason}
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => {
          if (removeMemberMutation.isPending) return;
          setShowRemoveMemberModal(false);
          setMemberToRemove(null);
          setRemoveReason("");
        }}
        isSubmitting={removeMemberMutation.isPending}
      />
    </div>
  );
}

export default GroupDetails;
