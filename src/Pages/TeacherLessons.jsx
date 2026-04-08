import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BiArrowBack } from "react-icons/bi";
import toast from "react-hot-toast";
import {
  setPrivateLessonAttendanceStatus,
  useAssignHomework,
  useCreatePrivateLesson,
  usePrivateLessonAttendanceStatuses,
  useRemovePrivateLesson,
  useSearchChildByCode,
  useTeacherChildren,
} from "../Services/apiTeacherChildren";
import { addInAppNotification } from "../Services/apiNotifications";
import { createEnrollmentRemoval } from "../Services/apiEnrollmentRemovals";
import ChildrenTab from "../Features/Teachers/TeacherLessons/ChildrenTab";
import HomeworkTab from "../Features/Teachers/TeacherLessons/HomeworkTab";
import PaymentsTab from "../Features/Teachers/TeacherLessons/PaymentsTab";
import AttendanceTab from "../Features/Teachers/TeacherLessons/AttendanceTab";
import AddChildByCodeModal from "../Features/Teachers/TeacherLessons/AddChildByCodeModal";
import AssignHomeworkModal from "../Features/Teachers/TeacherLessons/AssignHomeworkModal";
import AddPrivateLessonDetailsModal from "../Features/Teachers/TeacherLessons/AddPrivateLessonDetailsModal";
import RemovalReasonModal from "../Ui/RemovalReasonModal";

function TeacherLessons() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("children");
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showPrivateLessonDetailsModal, setShowPrivateLessonDetailsModal] =
    useState(false);
  const [selectedChildForPrivateLesson, setSelectedChildForPrivateLesson] =
    useState(null);
  const [showAssignHomeworkModal, setShowAssignHomeworkModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [homeworkLessonFilter, setHomeworkLessonFilter] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [lessonToRemove, setLessonToRemove] = useState(null);
  const [removeReason, setRemoveReason] = useState("");

  const {
    data: children,
    isLoading: childrenLoading,
    refetch: refetchChildren,
  } = useTeacherChildren();
  const searchChildMutation = useSearchChildByCode();
  const createPrivateLessonMutation = useCreatePrivateLesson();
  const assignHomeworkMutation = useAssignHomework();
  const removePrivateLessonMutation = useRemovePrivateLesson();

  const existingPrivateChildIds = Array.from(
    new Set((children || []).map((lesson) => lesson?.childID).filter(Boolean)),
  );

  const { data: attendanceStatusByLesson = {}, refetch: refetchAttendance } =
    usePrivateLessonAttendanceStatuses(children || []);

  const handleAssignHomework = (lesson) => {
    setSelectedLesson(lesson);
    setShowAssignHomeworkModal(true);
  };

  const handleViewHomework = (lesson) => {
    setHomeworkLessonFilter(lesson.id);
    setActiveTab("homework");
  };

  const handleSetAttendanceStatus = async (lesson, status) => {
    if (!lesson?.childID || !lesson?.id) return;

    try {
      await setPrivateLessonAttendanceStatus({
        childId: lesson.childID,
        lesson: {
          id: lesson.id,
          subject: lesson.subject,
          lessonDay: lesson.lessonDay,
          lessonTime: lesson.lessonTime,
          date: new Date().toISOString().split("T")[0],
          location: lesson.location,
          price: lesson.price,
        },
        status,
      });

      addInAppNotification({
        childId: lesson.childID,
        type: "lesson_canceled",
        title: "تحديث حالة الدرس",
        message:
          status === "teacher_canceled"
            ? `تم تسجيل: المستر الغي درس ${lesson.subject || "خصوصي"}`
            : `تم تسجيل: الطفل الغي درس ${lesson.subject || "خصوصي"}`,
        dedupeKey: `private-attendance-${lesson.id}-${lesson.childID}-${status}`,
        payload: {
          privateLessonId: lesson.id,
          status,
        },
      });

      await refetchAttendance();
      toast.success("تم تسجيل حالة الحضور");
    } catch (error) {
      toast.error(error?.message || "تعذر تسجيل حالة الحضور");
      console.error(error);
    }
  };

  const handleOpenPrivateAnalytics = (lesson) => {
    if (!lesson?.id || !lesson?.childID) return;
    navigate(
      `/teacher/lessons/student/${lesson.id}/${lesson.childID}/analytics`,
    );
  };

  const handleOpenRemoveModal = (lesson) => {
    setLessonToRemove(lesson);
    setRemoveReason("");
    setShowRemoveModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!lessonToRemove?.id) return;

    const reason = removeReason.trim();
    if (!reason) {
      toast.error("يجب كتابة سبب الإزالة");
      return;
    }

    try {
      await createEnrollmentRemoval({
        childId: lessonToRemove.childID,
        parentId: lessonToRemove.children?.parentID,
        removalType: "private_lesson",
        privateLessonId: lessonToRemove.id,
        reason,
        metadata: {
          subject: lessonToRemove.subject || null,
          lessonDay: lessonToRemove.lessonDay || null,
          lessonTime: lessonToRemove.lessonTime || null,
        },
      });

      await removePrivateLessonMutation.mutateAsync(lessonToRemove.id);

      addInAppNotification({
        childId: lessonToRemove.childID,
        type: "private_lesson_removed",
        title: "إزالة من الدروس الخصوصية",
        message: `تمت إزالة ${lessonToRemove.children?.name || "الطالب"} من الدروس الخصوصية. السبب: ${reason}`,
        dedupeKey: `private-lesson-removed-${lessonToRemove.id}-${reason}`,
        payload: {
          lessonId: lessonToRemove.id,
          reason,
        },
      });

      toast.success("تمت إزالة الطالب من الدروس الخصوصية");
      setShowRemoveModal(false);
      setLessonToRemove(null);
      setRemoveReason("");
      refetchChildren();
    } catch (error) {
      toast.error(error?.message || "تعذر إزالة الطالب");
      console.error(error);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6"
      dir="rtl"
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

          <div className="rounded-xl bg-white p-6 shadow">
            <h1 className="text-3xl font-bold text-gray-800">
              الدروس الخصوصية
            </h1>
            <p className="mt-2 text-gray-600">
              أضف الطلاب بواسطة كود الطالب وأسند الواجبات
            </p>
          </div>
        </div>

        <div className="tabs-scrollbar mb-6 flex gap-2 overflow-x-scroll rounded-xl bg-white p-2 shadow">
          <button
            onClick={() => setActiveTab("children")}
            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition ${activeTab === "children" ? "bg-purple-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
          >
            الطلاب ({children?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("homework")}
            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition ${activeTab === "homework" ? "bg-purple-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
          >
            الواجبات
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition ${activeTab === "payments" ? "bg-purple-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
          >
            المدفوعات
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition ${activeTab === "attendance" ? "bg-purple-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
          >
            الحضور
          </button>
        </div>

        {activeTab === "children" ? (
          <ChildrenTab
            children={children}
            childrenLoading={childrenLoading}
            onAddChild={() => setShowAddChildModal(true)}
            onAssignHomework={handleAssignHomework}
            onViewHomework={handleViewHomework}
            onRemoveLesson={handleOpenRemoveModal}
            onOpenAnalytics={handleOpenPrivateAnalytics}
          />
        ) : null}

        {activeTab === "homework" ? (
          <HomeworkTab
            children={children}
            selectedLessonId={homeworkLessonFilter}
            onClearLessonFilter={() => setHomeworkLessonFilter(null)}
          />
        ) : null}

        {activeTab === "payments" ? <PaymentsTab /> : null}

        {activeTab === "attendance" ? (
          <AttendanceTab
            children={children}
            childrenLoading={childrenLoading}
            attendanceStatusByLesson={attendanceStatusByLesson}
            onSetAttendanceStatus={handleSetAttendanceStatus}
          />
        ) : null}

        {showAddChildModal ? (
          <AddChildByCodeModal
            searchMutation={searchChildMutation}
            existingChildIds={existingPrivateChildIds}
            onClose={() => setShowAddChildModal(false)}
            onSuccess={(child) => {
              setShowAddChildModal(false);
              setSelectedChildForPrivateLesson(child);
              setShowPrivateLessonDetailsModal(true);
            }}
          />
        ) : null}

        {showPrivateLessonDetailsModal && selectedChildForPrivateLesson ? (
          <AddPrivateLessonDetailsModal
            child={selectedChildForPrivateLesson}
            createPrivateLessonMutation={createPrivateLessonMutation}
            onClose={() => {
              setShowPrivateLessonDetailsModal(false);
              setSelectedChildForPrivateLesson(null);
            }}
            onSuccess={() => {
              setShowPrivateLessonDetailsModal(false);
              setSelectedChildForPrivateLesson(null);
              refetchChildren();
            }}
          />
        ) : null}

        {showAssignHomeworkModal && selectedLesson ? (
          <AssignHomeworkModal
            lesson={selectedLesson}
            assignHomeworkMutation={assignHomeworkMutation}
            onClose={() => {
              setShowAssignHomeworkModal(false);
              setSelectedLesson(null);
            }}
            onSuccess={() => {
              setShowAssignHomeworkModal(false);
              setSelectedLesson(null);
              refetchChildren();
            }}
          />
        ) : null}

        <RemovalReasonModal
          isOpen={showRemoveModal}
          title="إزالة طالب من الدروس الخصوصية"
          subjectLabel="الطالب"
          subjectName={lessonToRemove?.children?.name || "-"}
          reason={removeReason}
          onReasonChange={setRemoveReason}
          onConfirm={handleConfirmRemove}
          onCancel={() => {
            if (removePrivateLessonMutation.isPending) return;
            setShowRemoveModal(false);
            setLessonToRemove(null);
            setRemoveReason("");
          }}
          isSubmitting={removePrivateLessonMutation.isPending}
        />
      </div>
    </div>
  );
}

export default TeacherLessons;
