const ATTENDANCE_KEY = "childAttendanceRecords";

function readStore() {
    try {
        return JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || "{}");
    } catch {
        return {};
    }
}

function writeStore(store) {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(store));
}

function makeRecordKey(childId, lessonId) {
    return `${childId}:${lessonId}`;
}

export function setLessonAttendanceStatus({ childId, lesson, status }) {
    const store = readStore();
    const key = makeRecordKey(childId, lesson.id);

    store[key] = {
        childId,
        lessonId: lesson.id,
        status,
        updatedAt: new Date().toISOString(),
        lesson: {
            subject: lesson.subject || "",
            teacherName: lesson.teacherName || "",
            lessonDay: lesson.lessonDay || "",
            lessonTime: lesson.lessonTime || "",
            date: lesson.date || "",
            location: lesson.location || "",
            price: lesson.price || 0,
        },
    };

    writeStore(store);
    return store[key];
}

export function getLessonAttendanceStatus(childId, lessonId) {
    const store = readStore();
    const key = makeRecordKey(childId, lessonId);
    return store[key]?.status || null;
}

export function getChildAttendanceRecords(childId) {
    const store = readStore();

    return Object.values(store)
        .filter((record) => record.childId === childId)
        .sort(
            (a, b) =>
                new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
        );
}

export function getChildAttendanceSummary(childId) {
    const records = getChildAttendanceRecords(childId);

    const summary = {
        total: records.length,
        attended: 0,
        childAbsent: 0,
        childLate: 0,
        teacherCanceled: 0,
    };

    records.forEach((record) => {
        if (record.status === "attended") summary.attended += 1;
        if (record.status === "child_absent") summary.childAbsent += 1;
        if (record.status === "child_late") summary.childLate += 1;
        if (record.status === "teacher_canceled") summary.teacherCanceled += 1;
    });

    return summary;
}

export function getChildAttendanceSubjectBreakdown(childId) {
    const records = getChildAttendanceRecords(childId);
    const map = new Map();

    records.forEach((record) => {
        const subject = record.lesson?.subject || "بدون مادة";
        const existing = map.get(subject) || {
            subject,
            total: 0,
            attended: 0,
            childAbsent: 0,
            childLate: 0,
            teacherCanceled: 0,
        };

        existing.total += 1;
        if (record.status === "attended") existing.attended += 1;
        if (record.status === "child_absent") existing.childAbsent += 1;
        if (record.status === "child_late") existing.childLate += 1;
        if (record.status === "teacher_canceled") existing.teacherCanceled += 1;

        map.set(subject, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
