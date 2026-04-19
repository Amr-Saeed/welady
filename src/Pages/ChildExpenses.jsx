import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { IoChevronForward } from "react-icons/io5";
import {
  BsCalendar3,
  BsCash,
  BsCheckCircle,
  BsClock,
  BsExclamationTriangle,
  BsReceipt,
} from "react-icons/bs";
import { useChildById } from "../Features/Parents/useChildInfo";
import { getExpenseMeta, saveExpenseMeta } from "../Services/apiLessonExpenses";
import {
  addInAppNotification,
  addTeacherInAppNotification,
} from "../Services/apiNotifications";
import {
  useAddLessonExpense,
  useLessonExpensesByChild,
  useSetLessonExpenseStatus,
  useSetLessonExpenseStatusByLesson,
} from "../Features/Parents/useLessonExpenses";
import { useManualLessonsByChild } from "../Features/Parents/useManualLessons";

function normalizeTeacherLabel(value) {
  const normalized = (value || "").toString().trim();
  if (!normalized) return "";
  if (normalized === "غير محدد" || normalized === "المدرس") return "";
  return normalized;
}

function pickTeacherLabel(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeTeacherLabel(candidate);
    if (normalized) return normalized;
  }
  return "مدرس غير محدد";
}

function ChildExpenses() {
  const navigate = useNavigate();
  const { childId } = useParams();

  const {
    data: child,
    isLoading: isChildLoading,
    error: childError,
  } = useChildById(childId);
  const {
    data: expenses = [],
    isLoading: isExpensesLoading,
    error: expensesError,
  } = useLessonExpensesByChild(childId);
  const {
    data: manualLessons = [],
    isLoading: isTeachersLoading,
    error: teachersError,
  } = useManualLessonsByChild(childId);

  const { mutateAsync: addExpense, isPending: isAddingExpense } =
    useAddLessonExpense(childId);
  const { mutateAsync: setExpenseStatus, isPending: isMarkingPaid } =
    useSetLessonExpenseStatus(childId);
  const {
    mutateAsync: upsertExpenseStatusByLesson,
    isPending: isUpsertingStatus,
  } = useSetLessonExpenseStatusByLesson(childId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [subject, setSubject] = useState("");
  const [paymentType, setPaymentType] = useState("monthly");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [pricePerSession, setPricePerSession] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [sessionGroupToConfirm, setSessionGroupToConfirm] = useState(null);

  const today = useMemo(() => new Date(), []);
  const currentMonthDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const teacherDirectory = useMemo(() => {
    const map = {};

    manualLessons.forEach((lesson) => {
      const teacher = (lesson.teacherName || "").trim();
      const lessonSubject = (lesson.subject || "").trim();

      if (!teacher) return;

      if (!map[teacher]) {
        map[teacher] = new Set();
      }

      if (lessonSubject) {
        map[teacher].add(lessonSubject);
      }
    });

    const normalized = {};
    Object.keys(map).forEach((teacher) => {
      normalized[teacher] = Array.from(map[teacher]);
    });

    return normalized;
  }, [manualLessons]);

  const teacherOptions = useMemo(
    () => Object.keys(teacherDirectory).sort((a, b) => a.localeCompare(b)),
    [teacherDirectory],
  );

  const subjectOptions = teacherName ? teacherDirectory[teacherName] || [] : [];

  const normalizedExpenses = useMemo(() => {
    return expenses.map((item) => {
      const meta = getExpenseMeta(item.id) || {};
      const itemMonth = item.month ? new Date(item.month) : null;
      const overdue =
        item.status === "unpaid" &&
        itemMonth &&
        itemMonth < new Date(currentMonthDate);

      return {
        ...item,
        meta,
        isOverdue: overdue,
      };
    });
  }, [expenses, currentMonthDate]);

  const summary = useMemo(() => {
    const isCurrentMonth = (d) => {
      if (!d) return false;
      const dt = new Date(d);
      return (
        dt.getFullYear() === today.getFullYear() &&
        dt.getMonth() === today.getMonth()
      );
    };

    const currentMonthRows = normalizedExpenses.filter((x) =>
      isCurrentMonth(x.month),
    );
    const total = currentMonthRows.reduce(
      (s, x) => s + Number(x.amount || 0),
      0,
    );
    const paid = currentMonthRows
      .filter((x) => x.status === "paid")
      .reduce((s, x) => s + Number(x.amount || 0), 0);
    const pending = currentMonthRows
      .filter((x) => x.status !== "paid" && !x.isOverdue)
      .reduce((s, x) => s + Number(x.amount || 0), 0);
    const overdue = currentMonthRows
      .filter((x) => x.isOverdue)
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    return { total, paid, pending, overdue };
  }, [normalizedExpenses, today]);

  const teacherGroups = useMemo(() => {
    const monthlyGroups = [];
    const sessionMap = new Map();

    normalizedExpenses.forEach((row) => {
      const teacherName = pickTeacherLabel(
        row.teacherName,
        row.meta.teacherName,
      );
      const subject = row.meta.subject || row.subject || "بدون مادة";
      const paymentType = row.meta.paymentType || "monthly";

      if (paymentType !== "session") {
        const status = row.status === "paid" ? "paid" : "pending";
        monthlyGroups.push({
          key: row.id,
          teacherName,
          subject,
          paymentType,
          total: Number(row.amount || 0),
          paid: row.status === "paid" ? Number(row.amount || 0) : 0,
          remaining: row.status === "paid" ? 0 : Number(row.amount || 0),
          status,
          nextPaymentDate: row.status === "paid" ? null : row.month,
          progress: row.status === "paid" ? 100 : 0,
          sessionCount: 1,
          rowIds: [row.id],
          unpaidRowIds: row.status === "paid" ? [] : [row.id],
          latestCreatedAt: row.created_at,
          pricePerSession: Number(row.meta.pricePerSession || row.amount || 0),
          notes: row.meta.notes || "",
          teacherID: row.teacherID || null,
          groupID: row.groupID || null,
          privateLessonID: row.privateLessonID || null,
          manualLessonID: row.manualLessonID || null,
          monthForUpsert: row.month || currentMonthDate,
          amountForUpsert: Number(row.amount || 0),
        });
        return;
      }

      const groupKey = `${teacherName}::${subject}::session`;
      const existing = sessionMap.get(groupKey);
      if (!existing) {
        const initialTotal = Number(row.amount || 0);
        const initialPaid = row.status === "paid" ? initialTotal : 0;
        sessionMap.set(groupKey, {
          key: `session-${groupKey}`,
          teacherName,
          subject,
          paymentType: "session",
          total: initialTotal,
          paid: initialPaid,
          remaining: initialTotal - initialPaid,
          status: row.status === "paid" ? "paid" : "pending",
          nextPaymentDate: row.status === "paid" ? null : row.month,
          sessionCount: 1,
          rowIds: [row.id],
          unpaidRowIds: row.status === "paid" ? [] : [row.id],
          latestCreatedAt: row.created_at,
          pricePerSession: Number(row.meta.pricePerSession || row.amount || 0),
          notes: row.meta.notes || "",
          teacherID: row.teacherID || null,
          groupID: row.groupID || null,
          privateLessonID: row.privateLessonID || null,
          manualLessonID: row.manualLessonID || null,
          monthForUpsert: row.month || currentMonthDate,
          amountForUpsert: Number(row.amount || 0),
        });
        return;
      }

      const rowAmount = Number(row.amount || 0);
      existing.total += rowAmount;
      if (row.status === "paid") {
        existing.paid += rowAmount;
      } else {
        existing.remaining += rowAmount;
        existing.unpaidRowIds.push(row.id);
        if (
          !existing.nextPaymentDate ||
          new Date(row.month) < new Date(existing.nextPaymentDate)
        ) {
          existing.nextPaymentDate = row.month;
        }
      }
      existing.sessionCount += 1;
      existing.rowIds.push(row.id);
      if (
        new Date(row.created_at || 0) > new Date(existing.latestCreatedAt || 0)
      ) {
        existing.latestCreatedAt = row.created_at;
      }
      if (!existing.teacherID && row.teacherID) {
        existing.teacherID = row.teacherID;
      }
      if (!existing.groupID && row.groupID) existing.groupID = row.groupID;
      if (!existing.privateLessonID && row.privateLessonID) {
        existing.privateLessonID = row.privateLessonID;
      }
      if (!existing.manualLessonID && row.manualLessonID) {
        existing.manualLessonID = row.manualLessonID;
      }
      if (!existing.monthForUpsert && row.month) {
        existing.monthForUpsert = row.month;
      }
      if (!existing.amountForUpsert && Number(row.amount || 0) > 0) {
        existing.amountForUpsert = Number(row.amount || 0);
      }
    });

    const sessionGroups = Array.from(sessionMap.values()).map((group) => {
      const progress =
        group.total > 0 ? Math.round((group.paid / group.total) * 100) : 0;
      return {
        ...group,
        status: group.remaining <= 0 ? "paid" : "pending",
        progress,
      };
    });

    return [...monthlyGroups, ...sessionGroups].sort(
      (a, b) =>
        new Date(b.latestCreatedAt || 0) - new Date(a.latestCreatedAt || 0),
    );
  }, [normalizedExpenses, currentMonthDate]);

  const inferredLessonCards = useMemo(() => {
    const byKey = new Map();

    manualLessons.forEach((lesson) => {
      const source = lesson.source;
      const groupID = lesson.groupID || null;
      const privateLessonID = lesson.privateLessonID || null;

      if (source !== "group" && source !== "private") return;

      const relationKey =
        source === "group" ? `group:${groupID}` : `private:${privateLessonID}`;
      if (!relationKey || relationKey.endsWith(":null")) return;

      if (byKey.has(relationKey)) return;

      byKey.set(relationKey, {
        key: `virtual-${relationKey}`,
        relationKey,
        teacherName: pickTeacherLabel(lesson.teacherName),
        subject: lesson.subject || "بدون مادة",
        paymentType: "monthly",
        total: Number(lesson.price || 0),
        paid: 0,
        remaining: Number(lesson.price || 0),
        status: "pending",
        nextPaymentDate: currentMonthDate,
        progress: 0,
        sessionCount: 1,
        rowIds: [],
        unpaidRowIds: [],
        latestCreatedAt: new Date().toISOString(),
        pricePerSession: Number(lesson.price || 0),
        notes: "",
        teacherID: lesson.teacherID || null,
        groupID,
        privateLessonID,
        manualLessonID: null,
        monthForUpsert: currentMonthDate,
        amountForUpsert: Number(lesson.price || 0),
      });
    });

    return Array.from(byKey.values());
  }, [manualLessons, currentMonthDate]);

  const displayTeacherGroups = useMemo(() => {
    const existingRelationKeys = new Set(
      teacherGroups.map((group) => {
        if (group.groupID) return `group:${group.groupID}`;
        if (group.privateLessonID) return `private:${group.privateLessonID}`;
        if (group.manualLessonID) return `manual:${group.manualLessonID}`;
        return group.key;
      }),
    );

    const merged = [...teacherGroups];
    inferredLessonCards.forEach((card) => {
      if (!existingRelationKeys.has(card.relationKey)) {
        merged.push(card);
      }
    });

    return merged.sort(
      (a, b) =>
        new Date(b.latestCreatedAt || 0).getTime() -
        new Date(a.latestCreatedAt || 0).getTime(),
    );
  }, [teacherGroups, inferredLessonCards]);

  const paymentHistory = useMemo(() => {
    return [...normalizedExpenses].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
  }, [normalizedExpenses]);

  const formatEGP = (value) =>
    `${Number(value || 0).toLocaleString("en-US")} EGP`;

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const computedTotal =
    paymentType === "monthly"
      ? Number(monthlyAmount || 0)
      : Number(pricePerSession || 0);

  const resetForm = () => {
    setTeacherName("");
    setSubject("");
    setPaymentType("monthly");
    setMonthlyAmount("");
    setPricePerSession("");
    setIsPaid(false);
    setNotes("");
  };

  const openAddExpenseModal = () => {
    if (!isTeachersLoading && teacherOptions.length === 0) {
      toast.error("لا يمكن إضافة مصروف بدون مدرس مرتبط بجدول الطفل");
      return;
    }
    setIsModalOpen(true);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!teacherName || !subject) {
      toast.error("من فضلك اختاري المدرس والمادة");
      return;
    }

    if (computedTotal <= 0) {
      toast.error("من فضلك أدخلي مبلغ صحيح");
      return;
    }

    try {
      const expenseId = await addExpense({
        childId,
        month: currentMonthDate,
        amount: computedTotal,
        status:
          paymentType === "monthly" ? (isPaid ? "paid" : "unpaid") : "unpaid",
        paymentDate:
          paymentType === "monthly" && isPaid ? new Date().toISOString() : null,
      });

      saveExpenseMeta(expenseId, {
        teacherName,
        subject,
        paymentType,
        monthlyAmount,
        pricePerSession,
        notes,
      });

      toast.success("تمت إضافة المصروف بنجاح");
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إضافة المصروف");
    }
  };

  const handleMarkPaid = async (group) => {
    try {
      const targetIds =
        group.paymentType === "session" ? group.unpaidRowIds : group.rowIds;

      if (targetIds.length > 0) {
        await Promise.all(
          targetIds.map((expenseId) =>
            setExpenseStatus({
              expenseId,
              childId,
              status: "paid",
              paymentDate: new Date().toISOString(),
            }),
          ),
        );
      } else {
        await upsertExpenseStatusByLesson({
          childId,
          status: "paid",
          paymentDate: new Date().toISOString(),
          month: group.monthForUpsert || currentMonthDate,
          amount: Number(group.amountForUpsert || group.total || 0),
          groupID: group.groupID || null,
          privateLessonID: group.privateLessonID || null,
          manualLessonID: group.manualLessonID || null,
        });
      }

      addInAppNotification({
        childId,
        type: "payment_status_updated",
        title: "تحديث حالة الدفع",
        message: `قام ولي الأمر بتحديد حالة الدفع: تم الدفع (${group.subject || "بدون مادة"})`,
        dedupeKey: `parent-payment-paid-${childId}-${group.key}-${String(group.nextPaymentDate || "")}`,
        payload: {
          status: "paid",
          source: "parent",
          subject: group.subject || null,
          paymentType: group.paymentType,
          amount: group.total,
        },
      });

      addTeacherInAppNotification({
        teacherId: group.teacherID,
        type: "payment_status_updated",
        title: "تحديث من ولي الأمر",
        message: `تم تحديث حالة دفع ${child?.name || "الطفل"} إلى: تم الدفع (${group.subject || "بدون مادة"})`,
        dedupeKey: `teacher-parent-payment-paid-${group.teacherID || ""}-${childId}-${group.key}-${String(group.nextPaymentDate || "")}`,
        payload: {
          childId,
          childName: child?.name || null,
          status: "paid",
          subject: group.subject || null,
          paymentType: group.paymentType,
          amount: group.total,
          groupId: group.groupID || null,
          privateLessonId: group.privateLessonID || null,
        },
      });

      toast.success("تم تحديث حالة الدفع");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تحديث حالة الدفع");
    }
  };

  const handleWillPayInLesson = async (group) => {
    try {
      if (group.rowIds.length > 0) {
        await Promise.all(
          group.rowIds.map((expenseId) =>
            setExpenseStatus({
              expenseId,
              childId,
              status: "unpaid",
              paymentDate: null,
            }),
          ),
        );
      } else {
        await upsertExpenseStatusByLesson({
          childId,
          status: "unpaid",
          paymentDate: null,
          month: group.monthForUpsert || currentMonthDate,
          amount: Number(group.amountForUpsert || group.total || 0),
          groupID: group.groupID || null,
          privateLessonID: group.privateLessonID || null,
          manualLessonID: group.manualLessonID || null,
        });
      }

      addInAppNotification({
        childId,
        type: "payment_status_updated",
        title: "تحديث حالة الدفع",
        message: `قام ولي الأمر بتحديد حالة الدفع: سيدفع في الدرس (${group.subject || "بدون مادة"})`,
        dedupeKey: `parent-payment-unpaid-${childId}-${group.key}-${String(group.nextPaymentDate || "")}`,
        payload: {
          status: "unpaid",
          source: "parent",
          subject: group.subject || null,
          paymentType: group.paymentType,
          amount: group.total,
        },
      });

      addTeacherInAppNotification({
        teacherId: group.teacherID,
        type: "payment_status_updated",
        title: "تحديث من ولي الأمر",
        message: `تم تحديث حالة دفع ${child?.name || "الطفل"} إلى: سيدفع في الدرس (${group.subject || "بدون مادة"})`,
        dedupeKey: `teacher-parent-payment-unpaid-${group.teacherID || ""}-${childId}-${group.key}-${String(group.nextPaymentDate || "")}`,
        payload: {
          childId,
          childName: child?.name || null,
          status: "unpaid",
          subject: group.subject || null,
          paymentType: group.paymentType,
          amount: group.total,
          groupId: group.groupID || null,
          privateLessonId: group.privateLessonID || null,
        },
      });

      toast.success("تم تعيين الحالة: سيدفع في الدرس");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تحديث الحالة");
    }
  };

  const handleAddSessionToGroup = async (group) => {
    const amount = Number(group.pricePerSession || 0);
    if (amount <= 0) {
      toast.error("لا يمكن إضافة الحصة لأن سعر الحصة غير محدد");
      return;
    }

    try {
      const expenseId = await addExpense({
        childId,
        month: currentMonthDate,
        amount,
        status: "unpaid",
        paymentDate: null,
      });

      saveExpenseMeta(expenseId, {
        teacherName: group.teacherName,
        subject: group.subject,
        paymentType: "session",
        monthlyAmount: "",
        pricePerSession: String(amount),
        notes: group.notes || "",
      });

      toast.success("تمت إضافة حصة جديدة لنفس المصروف");
      setSessionGroupToConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إضافة الحصة");
    }
  };

  if (isChildLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        جاري التحميل...
      </div>
    );
  }

  if (childError || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        حدث خطأ في تحميل صفحة المصروفات
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 pb-28 max-w-md mx-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate(`/parent/child/${childId}`)}
          className="flex items-center gap-2 text-gray-700 hover:text-[var(--main-color)] transition-colors"
        >
          <IoChevronForward className="text-2xl" />
          <span className="text-lg font-semibold">المصاريف</span>
        </button>
      </div>

      <div className="px-4 pt-5 space-y-5">
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsReceipt /> إجمالي الشهر
            </div>
            <div className="font-bold text-gray-900">
              {formatEGP(summary.total)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsCheckCircle /> تم دفعه
            </div>
            <div className="font-bold text-emerald-600">
              {formatEGP(summary.paid)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsClock /> المتبقي
            </div>
            <div className="font-bold text-amber-600">
              {formatEGP(summary.pending)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <BsExclamationTriangle /> متأخر
            </div>
            <div className="font-bold text-red-600">
              {formatEGP(summary.overdue)}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">مصروفات المدرسين</h2>
          {isExpensesLoading && (
            <div className="text-sm text-gray-600">جاري تحميل المصروفات...</div>
          )}
          {expensesError && (
            <div className="text-sm text-red-500">
              حدث خطأ في تحميل المصروفات
            </div>
          )}
          {!isExpensesLoading &&
            !expensesError &&
            displayTeacherGroups.length === 0 && (
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-sm text-gray-600">
                لا توجد مصروفات بعد. اضغطي على + لإضافة مصروف جديد.
              </div>
            )}

          {displayTeacherGroups.map((group) => (
            <div
              key={group.key}
              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">
                    {group.teacherName}
                  </h3>
                  <p className="text-xs text-gray-500">{group.subject}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 text-center rounded-full font-semibold ${
                    group.status === "paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {group.status === "paid" ? "تم الدفع" : "لم يتم الدفع"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">نوع الدفع:</span>{" "}
                  <span className="font-semibold">
                    {group.paymentType === "monthly" ? "شهري" : "بالحصة"}
                  </span>
                </div>
                {group.paymentType === "session" && (
                  <div>
                    <span className="text-gray-500">عدد الحصص:</span>{" "}
                    <span className="font-semibold">{group.sessionCount}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">إجمالي الشهر:</span>{" "}
                  <span className="font-semibold">
                    {formatEGP(group.total)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">المدفوع:</span>{" "}
                  <span className="font-semibold text-emerald-600">
                    {formatEGP(group.paid)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">المتبقي:</span>{" "}
                  <span className="font-semibold text-amber-600">
                    {formatEGP(group.remaining)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">تاريخ الدفع القادم:</span>{" "}
                  <span className="font-semibold">
                    {formatDate(group.nextPaymentDate)}
                  </span>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-gray-100 mt-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${group.progress}%` }}
                />
              </div>

              {group.status !== "paid" && (
                <button
                  type="button"
                  onClick={() => handleMarkPaid(group)}
                  disabled={isMarkingPaid || isUpsertingStatus}
                  className="w-full mt-3 bg-[var(--main-color)] hover:bg-[var(--main-dark-color)] text-white font-bold py-2.5 rounded-xl disabled:opacity-60"
                >
                  تم الدفع
                </button>
              )}

              {group.paymentType === "session" && group.status !== "paid" && (
                <button
                  type="button"
                  onClick={() => handleWillPayInLesson(group)}
                  disabled={isMarkingPaid || isUpsertingStatus}
                  className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-xl border border-gray-300 disabled:opacity-60"
                >
                  سيدفع في الدرس
                </button>
              )}

              {group.paymentType === "session" && (
                <button
                  type="button"
                  onClick={() => setSessionGroupToConfirm(group)}
                  disabled={isAddingExpense}
                  className="w-full mt-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold py-2.5 rounded-xl border border-blue-200 disabled:opacity-60"
                >
                  {isAddingExpense ? "جاري إضافة الحصة..." : "إضافة حصة"}
                </button>
              )}
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            سجل المدفوعات
          </h2>
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {paymentHistory.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-xl border border-gray-200 p-3 text-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">
                    {formatEGP(row.amount)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      row.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {row.status === "paid" ? "تم الدفع" : "لم يتم الدفع"}
                  </span>
                </div>
                <div className="text-gray-600 mt-1">
                  {pickTeacherLabel(
                    row.teacherName,
                    getExpenseMeta(row.id)?.teacherName,
                  )}
                </div>
                <div className="text-gray-500 text-xs">
                  {formatDate(row.paymentDate || row.created_at)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">إضافة مصروف</h2>
            <form onSubmit={handleAddExpense} className="space-y-3">
              {isTeachersLoading && (
                <div className="text-sm text-gray-600">
                  جاري تحميل المدرسين...
                </div>
              )}
              {teachersError && (
                <div className="text-sm text-red-500">
                  حدث خطأ في تحميل المدرسين
                </div>
              )}

              <select
                value={teacherName}
                onChange={(e) => {
                  const nextTeacher = e.target.value;
                  setTeacherName(nextTeacher);
                  const nextSubjects = teacherDirectory[nextTeacher] || [];
                  setSubject(nextSubjects[0] || "");
                }}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white"
                disabled={isTeachersLoading || teacherOptions.length === 0}
              >
                <option value="">اختاري المدرس</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher} value={teacher}>
                    {teacher}
                  </option>
                ))}
              </select>

              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white"
                disabled={!teacherName || subjectOptions.length === 0}
              >
                <option value="">اختاري المادة</option>
                {subjectOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType("monthly")}
                  className={`py-2 rounded-lg border ${paymentType === "monthly" ? "bg-[var(--main-color)] text-white border-[var(--main-color)]" : "border-gray-300"}`}
                >
                  شهري
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("session")}
                  className={`py-2 rounded-lg border ${paymentType === "session" ? "bg-[var(--main-color)] text-white border-[var(--main-color)]" : "border-gray-300"}`}
                >
                  بالحصة
                </button>
              </div>

              {paymentType === "monthly" ? (
                <input
                  type="number"
                  min="0"
                  placeholder="المبلغ الشهري"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  placeholder="سعر الحصة"
                  value={pricePerSession}
                  onChange={(e) => setPricePerSession(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
              )}

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm">
                <span className="text-gray-500">الإجمالي:</span>{" "}
                <span className="font-bold">{formatEGP(computedTotal)}</span>
              </div>

              {paymentType === "monthly" && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <label className="block font-semibold mb-2">تم الدفع؟</label>
                  <select
                    value={isPaid ? "yes" : "no"}
                    onChange={(e) => setIsPaid(e.target.value === "yes")}
                    className="w-full border border-gray-300 rounded-lg p-3 bg-white"
                  >
                    <option value="yes">ايوة</option>
                    <option value="no">لا</option>
                  </select>
                </div>
              )}

              <textarea
                placeholder="ملاحظات (اختياري)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 min-h-24"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isAddingExpense}
                  className="w-1/2 py-3 rounded-xl bg-[var(--main-color)] text-white font-bold disabled:opacity-50"
                >
                  {isAddingExpense ? "جاري الحفظ..." : "حفظ المصروف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sessionGroupToConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
            <h3 className="text-lg font-bold text-gray-900">تأكيد إضافة حصة</h3>
            <p className="text-sm text-gray-600 mt-2">
              هل تريد إضافة حصة جديدة للمدرس{" "}
              <span className="font-semibold text-gray-900">
                {sessionGroupToConfirm.teacherName}
              </span>
              ؟
            </p>
            <p className="text-sm text-gray-600 mt-1">
              المادة: {sessionGroupToConfirm.subject}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              سعر الحصة: {formatEGP(sessionGroupToConfirm.pricePerSession)}
            </p>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setSessionGroupToConfirm(null)}
                className="w-1/2 py-3 rounded-xl border border-gray-300"
                disabled={isAddingExpense}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleAddSessionToGroup(sessionGroupToConfirm)}
                className="w-1/2 py-3 rounded-xl bg-[var(--main-color)] text-white font-bold disabled:opacity-50"
                disabled={isAddingExpense}
              >
                {isAddingExpense ? "جاري الإضافة..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={openAddExpenseModal}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[var(--main-color)] hover:bg-[var(--main-dark-color)] text-white shadow-lg px-6 py-3 rounded-xl font-bold"
        aria-label="إضافة سعر درس"
      >
        إضافة سعر درس
      </button>
    </div>
  );
}

export default ChildExpenses;
