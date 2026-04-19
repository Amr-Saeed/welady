import { supabase } from "./supabase";
import { addTeacherInAppNotification } from "./apiNotifications";

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

function makeRecordKey(childId, lessonKey) {
    return `${childId}:${lessonKey}`;
}

function toDateString(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
    }

    const text = String(value).trim();
    if (!text) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function normalizeAttendanceStatus(status) {
    const value = String(status || "").toLowerCase();

    if (value === "attending" || value === "attended" || value === "present") {
        return "attended";
    }

    if (
        value === "absent" ||
        value === "child_absent" ||
        value === "child_canceled" ||
        value === "will_absent"
    ) {
        return "child_absent";
    }

    if (value === "late" || value === "child_late") {
        return "child_late";
    }

    if (value === "canceled" || value === "teacher_canceled") {
        return "teacher_canceled";
    }

    return value || null;
}

function toDatabaseAttendanceStatus(status) {
    const value = String(status || "").toLowerCase();

    if (value === "will_attend" || value === "attending" || value === "attended") {
        return "attending";
    }

    if (value === "will_absent" || value === "absent" || value === "child_absent") {
        return "absent";
    }

    if (value === "child_late" || value === "late") {
        return "late";
    }

    if (value === "teacher_canceled" || value === "canceled") {
        return "canceled";
    }

    return value || null;
}

function getLessonReference(lesson = {}) {
    const groupID = lesson.groupID || lesson.groupId || null;
    const privateLessonID = lesson.privateLessonID || lesson.privateLessonId || null;
    const manualLessonID = lesson.manualLessonID || lesson.manualLessonId || (!groupID && !privateLessonID ? lesson.id || null : null);

    return {
        groupID,
        privateLessonID,
        manualLessonID,
    };
}

export function getAttendanceLessonKey(lesson = {}) {
    const lessonDate = toDateString(
        lesson.lessonDate || lesson.date || lesson.timestamp || lesson.created_at,
    );
    const reference = getLessonReference(lesson);

    return [
        reference.groupID || "",
        reference.privateLessonID || "",
        reference.manualLessonID || "",
        lessonDate || "",
    ].join("__");
}

function getAttendanceRowKey(row = {}) {
    const reference = getLessonReference(row);
    const lessonDate = toDateString(row.lessonDate || row.lesson_date || row.date || row.timestamp);

    return [
        reference.groupID || "",
        reference.privateLessonID || "",
        reference.manualLessonID || "",
        lessonDate || "",
    ].join("__");
}

function normalizeAttendanceRow(row) {
    if (!row) return null;

    return {
        ...row,
        status: normalizeAttendanceStatus(row.status),
        rawStatus: row.status || null,
        childID: row.childID || row.child_id || null,
        groupID: row.groupID || row.group_id || null,
        privateLessonID: row.privateLessonID || row.private_lesson_id || null,
        manualLessonID: row.manualLessonID || row.manual_lesson_id || null,
        lessonDate: row.lessonDate || row.lesson_date || null,
        markedByRole: row.markedByRole || row.marked_by_role || null,
        markedAt: row.marked_at || row.markedAt || row.created_at || null,
        notes: row.notes || "",
        attendanceKey: getAttendanceRowKey(row),
    };
}

function upsertLocalAttendanceRecord(record) {
    const store = readStore();
    const key = makeRecordKey(record.childID, getAttendanceRowKey(record));

    store[key] = {
        ...record,
        updatedAt: record.updated_at || record.updatedAt || new Date().toISOString(),
        lesson: {
            subject: record.subject || record.lesson?.subject || "",
            teacherName: record.teacherName || record.lesson?.teacherName || "",
            lessonDay: record.lessonDay || record.lesson?.lessonDay || "",
            lessonTime: record.lessonTime || record.lesson?.lessonTime || "",
            date: record.lessonDate || record.lesson?.date || "",
            location: record.location || record.lesson?.location || "",
            price: record.price || record.lesson?.price || 0,
        },
    };

    writeStore(store);
}

async function resolveTeacherTarget(lesson = {}) {
    const reference = getLessonReference(lesson);

    if (reference.groupID) {
        const { data, error } = await supabase
            .from("groups")
            .select("id, teacherID, teacherName, subject")
            .eq("id", reference.groupID)
            .maybeSingle();

        if (!error && data) {
            return {
                teacherId: data.teacherID || null,
                teacherName: data.teacherName || null,
                subject: data.subject || lesson.subject || null,
                targetType: "group",
                targetId: data.id,
            };
        }
    }

    if (reference.privateLessonID) {
        const { data, error } = await supabase
            .from("private_lessons")
            .select("id, teacherID, subject")
            .eq("id", reference.privateLessonID)
            .maybeSingle();

        if (!error && data) {
            return {
                teacherId: data.teacherID || null,
                teacherName: lesson.teacherName || null,
                subject: data.subject || lesson.subject || null,
                targetType: "private",
                targetId: data.id,
            };
        }
    }

    if (reference.manualLessonID) {
        const { data, error } = await supabase
            .from("manual_lessons")
            .select("id, teacherID, teacherName, subject")
            .eq("id", reference.manualLessonID)
            .maybeSingle();

        if (!error && data) {
            return {
                teacherId: data.teacherID || null,
                teacherName: data.teacherName || lesson.teacherName || null,
                subject: data.subject || lesson.subject || null,
                targetType: "manual",
                targetId: data.id,
            };
        }
    }

    return {
        teacherId: null,
        teacherName: lesson.teacherName || null,
        subject: lesson.subject || null,
        targetType: null,
        targetId: null,
    };
}

async function persistAttendanceRow({ childId, childName, lesson, status, notes = "" }) {
    const lessonDate = toDateString(lesson?.lessonDate || lesson?.date || lesson?.timestamp);
    if (!childId || !lessonDate) {
        throw new Error("Invalid attendance lesson payload");
    }

    const reference = getLessonReference(lesson);
    const dbStatus = toDatabaseAttendanceStatus(status);
    if (!dbStatus) {
        throw new Error("Invalid attendance status");
    }

    const payload = {
        childID: childId,
        lessonDate,
        status: dbStatus,
        notes: notes || "",
        markedByRole: "parent",
        marked_at: new Date().toISOString(),
        ...reference,
    };

    let existingQuery = supabase
        .from("attendance")
        .select("id")
        .eq("childID", childId)
        .eq("lessonDate", lessonDate);

    if (reference.groupID) {
        existingQuery = existingQuery.eq("groupID", reference.groupID);
    } else {
        existingQuery = existingQuery.is("groupID", null);
    }

    if (reference.privateLessonID) {
        existingQuery = existingQuery.eq("privateLessonID", reference.privateLessonID);
    } else {
        existingQuery = existingQuery.is("privateLessonID", null);
    }

    if (reference.manualLessonID) {
        existingQuery = existingQuery.eq("manualLessonID", reference.manualLessonID);
    } else {
        existingQuery = existingQuery.is("manualLessonID", null);
    }

    const { data: existingRow, error: existingError } = await existingQuery.maybeSingle();

    if (existingError) throw existingError;

    let savedRow;
    if (existingRow?.id) {
        const { data, error } = await supabase
            .from("attendance")
            .update(payload)
            .eq("id", existingRow.id)
            .select("*")
            .single();

        if (error) throw error;
        savedRow = data;
    } else {
        const { data, error } = await supabase
            .from("attendance")
            .insert(payload)
            .select("*")
            .single();

        if (error) throw error;
        savedRow = data;
    }

    const normalizedRow = normalizeAttendanceRow(savedRow);
    upsertLocalAttendanceRecord({
        ...normalizedRow,
        lesson: {
            subject: lesson.subject || "",
            teacherName: lesson.teacherName || "",
            lessonDay: lesson.lessonDay || "",
            lessonTime: lesson.lessonTime || "",
            date: lesson.date || lesson.lessonDate || "",
            location: lesson.location || "",
            price: lesson.price || 0,
        },
    });

    const teacherTarget = await resolveTeacherTarget(lesson);
    if (teacherTarget.teacherId) {
        const desiredState = dbStatus === "absent" ? "لن يحضر" : "سيحضر";
        const reasonSuffix = notes ? ` | السبب: ${notes}` : "";

        addTeacherInAppNotification({
            teacherId: teacherTarget.teacherId,
            type: "attendance_decision",
            title: "تحديث حضور من ولي الأمر",
            message: `${childName || "الطفل"} ${desiredState} في ${teacherTarget.subject || lesson.subject || "الحصة"}${reasonSuffix}`,
            dedupeKey: `attendance-decision-${teacherTarget.targetType || "lesson"}-${teacherTarget.targetId || lesson.id}-${childId}-${lessonDate}-${dbStatus}-${notes || ""}`,
            payload: {
                childId,
                childName: childName || null,
                lessonDate,
                status: dbStatus,
                notes: notes || null,
                groupId: reference.groupID || null,
                privateLessonId: reference.privateLessonID || null,
                manualLessonId: reference.manualLessonID || null,
                teacherTargetType: teacherTarget.targetType,
                teacherTargetId: teacherTarget.targetId,
            },
        });
    }

    return normalizedRow;
}

export async function setLessonAttendanceStatus({ childId, childName = "", lesson, status, notes = "" }) {
    return persistAttendanceRow({ childId, childName, lesson, status, notes });
}

export function getLessonAttendanceStatus(childId, lesson) {
    const store = readStore();
    const key = makeRecordKey(childId, getAttendanceLessonKey(lesson));
    return store[key]?.status || null;
}

export async function getChildAttendanceRecords(childId) {
    if (!childId) return [];

    try {
        const { data, error } = await supabase
            .from("attendance")
            .select("*")
            .eq("childID", childId)
            .order("lessonDate", { ascending: false })
            .order("marked_at", { ascending: false });

        if (!error) {
            const rows = (data || []).map((row) => normalizeAttendanceRow(row)).filter(Boolean);
            if (rows.length > 0) return rows;
        }
    } catch {
        // Fallback below.
    }

    const store = readStore();
    return Object.values(store)
        .filter((record) => record.childID === childId || record.childId === childId)
        .map((record) => normalizeAttendanceRow(record))
        .filter(Boolean)
        .sort((a, b) => new Date(b.markedAt || b.updatedAt || 0).getTime() - new Date(a.markedAt || a.updatedAt || 0).getTime());
}

export async function getChildAttendanceSummary(childId) {
    const records = await getChildAttendanceRecords(childId);

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

export async function getChildAttendanceSubjectBreakdown(childId) {
    const records = await getChildAttendanceRecords(childId);
    const map = new Map();

    records.forEach((record) => {
        const subject = record.lesson?.subject || record.subject || "بدون مادة";
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
