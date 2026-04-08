const MANUAL_NOTIFICATIONS_KEY = "childNotificationsManual";

function readStore() {
    try {
        return JSON.parse(localStorage.getItem(MANUAL_NOTIFICATIONS_KEY) || "[]");
    } catch {
        return [];
    }
}

function writeStore(items) {
    localStorage.setItem(MANUAL_NOTIFICATIONS_KEY, JSON.stringify(items));
}

function toDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

function getLessonDateTime(lesson) {
    if (!lesson?.date || !lesson?.lessonTime) return null;
    return toDate(`${lesson.date}T${lesson.lessonTime}`);
}

function getDueDate(value) {
    if (!value) return null;
    return toDate(`${value}T23:59:59`);
}

function isWithinHours(date, now, hours) {
    if (!date) return false;
    const diff = date.getTime() - now.getTime();
    return diff >= 0 && diff <= hours * 60 * 60 * 1000;
}

function isPast(date, now) {
    return !!date && date.getTime() < now.getTime();
}

export function addInAppNotification({
    childId,
    type,
    title,
    message,
    dedupeKey,
    payload,
}) {
    const items = readStore();

    if (dedupeKey) {
        const existing = items.find(
            (item) => item.childId === childId && item.dedupeKey === dedupeKey,
        );
        if (existing) return existing;
    }

    const next = {
        id: crypto.randomUUID(),
        childId,
        type,
        title,
        message,
        payload: payload || null,
        dedupeKey: dedupeKey || null,
        createdAt: new Date().toISOString(),
        source: "manual",
    };

    items.push(next);
    writeStore(items);
    return next;
}

export function getManualChildNotifications(childId) {
    return readStore()
        .filter((item) => item.childId === childId)
        .sort(
            (a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        );
}

export function markManualNotificationResolved(notificationId, payloadPatch = {}) {
    const items = readStore();
    const next = items.map((item) => {
        if (item.id !== notificationId) return item;
        return {
            ...item,
            payload: {
                ...(item.payload || {}),
                ...payloadPatch,
                resolved: true,
            },
        };
    });
    writeStore(next);
}

function buildLessonReminderNotifications({ childId, lessons, now }) {
    return lessons
        .map((lesson) => {
            const lessonDate = getLessonDateTime(lesson);
            if (!isWithinHours(lessonDate, now, 1)) return null;

            return {
                id: `lesson-reminder-${lesson.id}-${lesson.date}-${lesson.lessonTime}`,
                childId,
                type: "lesson_reminder",
                title: "تذكير بالحصة",
                message: `بعد أقل من ساعة: ${lesson.subject || "حصة"} مع ${lesson.teacherName || "المدرس"}`,
                createdAt: lessonDate.toISOString(),
                source: "system",
            };
        })
        .filter(Boolean);
}

function buildHomeworkNotifications({ childId, homeworks, now }) {
    const overdue = homeworks
        .map((hw) => {
            const due = getDueDate(hw.dueDate);
            if (!isPast(due, now)) return null;

            return {
                id: `homework-overdue-${hw.id}`,
                childId,
                type: "homework_overdue",
                title: "واجب متأخر",
                message: `انتهى موعد تسليم واجب: ${hw.title || "بدون عنوان"}`,
                createdAt: due ? due.toISOString() : new Date().toISOString(),
                source: "system",
            };
        })
        .filter(Boolean);

    return overdue;
}

function buildPaymentNotifications({ childId, expenses, now }) {
    return expenses
        .map((expense) => {
            if (expense.status === "paid") return null;

            const dueDate = toDate(`${expense.month}T23:59:59`);
            if (!dueDate) return null;

            if (isWithinHours(dueDate, now, 24)) {
                return {
                    id: `payment-before-due-${expense.id}`,
                    childId,
                    type: "payment_before_due",
                    title: "تذكير دفع",
                    message: `موعد المصروف خلال 24 ساعة: ${Number(expense.amount || 0)} ج.م`,
                    createdAt: dueDate.toISOString(),
                    source: "system",
                };
            }

            if (isPast(dueDate, now)) {
                return {
                    id: `payment-overdue-${expense.id}`,
                    childId,
                    type: "payment_overdue",
                    title: "مصروف متأخر",
                    message: `يوجد مصروف متأخر بقيمة ${Number(expense.amount || 0)} ج.م`,
                    createdAt: dueDate.toISOString(),
                    source: "system",
                };
            }

            return null;
        })
        .filter(Boolean);
}

function buildAttendanceAlerts({ childId, attendanceRecords, now }) {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return attendanceRecords
        .map((record) => {
            const updatedAt = toDate(record.updatedAt);
            if (!updatedAt || updatedAt < weekAgo) return null;

            if (record.status === "child_absent") {
                return {
                    id: `attendance-absent-${record.lessonId}-${record.updatedAt}`,
                    childId,
                    type: "attendance_absent",
                    title: "تنبيه حضور",
                    message: `الطفل لم يحضر حصة ${record.lesson?.subject || "بدون مادة"}`,
                    createdAt: updatedAt.toISOString(),
                    source: "system",
                };
            }

            if (record.status === "child_late") {
                return {
                    id: `attendance-late-${record.lessonId}-${record.updatedAt}`,
                    childId,
                    type: "attendance_late",
                    title: "تنبيه حضور",
                    message: `الطفل تأخر على حصة ${record.lesson?.subject || "بدون مادة"}`,
                    createdAt: updatedAt.toISOString(),
                    source: "system",
                };
            }

            return null;
        })
        .filter(Boolean);
}

export function buildChildNotifications({
    childId,
    lessons = [],
    homeworks = [],
    expenses = [],
    attendanceRecords = [],
}) {
    const now = new Date();
    const manual = getManualChildNotifications(childId);
    const system = [
        ...buildLessonReminderNotifications({ childId, lessons, now }),
        ...buildHomeworkNotifications({ childId, homeworks, now }),
        ...buildPaymentNotifications({ childId, expenses, now }),
        ...buildAttendanceAlerts({ childId, attendanceRecords, now }),
    ];

    const merged = [...manual, ...system];

    return merged.sort(
        (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
}
