import { supabase } from "./supabase";

const AR_DAY_TO_INDEX = {
    "الأحد": 0,
    "الاثنين": 1,
    "الثلاثاء": 2,
    "الأربعاء": 3,
    "الخميس": 4,
    "الجمعة": 5,
    "السبت": 6,
};

function nextDateForDayName(dayName) {
    const targetDay = AR_DAY_TO_INDEX[dayName];
    if (targetDay === undefined) return null;

    const now = new Date();
    const candidate = new Date(now);
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    candidate.setDate(now.getDate() + diff);

    const yyyy = candidate.getFullYear();
    const mm = String(candidate.getMonth() + 1).padStart(2, "0");
    const dd = String(candidate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function toSortStamp(row) {
    const datePart = row.date || "9999-12-31";
    const timePart = row.lessonTime || "23:59:59";
    return `${datePart}T${timePart}`;
}

function normalizeTeacherName(value) {
    const normalized = String(value || "").trim();
    if (!normalized) return null;
    if (normalized === "غير محدد" || normalized === "المدرس") return null;
    return normalized;
}

function normalizeDayList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
}

function normalizeTimeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
}

// Get manual lessons for one child
export async function getManualLessonsByChildId(childId) {
    const { data: manualRows, error } = await supabase.rpc("get_parent_manual_lessons", {
        p_child_id: childId,
    });

    if (error) throw error;

    const { data: privateRows, error: privateError } = await supabase
        .from("private_lessons")
        .select("id, childID, subject, lessonDay, lessonTime, location, price, teacherID")
        .eq("childID", childId)
        .eq("isActive", true)
        .order("created_at", { ascending: false });

    if (privateError) {
        console.warn("⚠️ Failed to fetch private lessons for child schedule:", privateError);
    }

    const { data: membershipRows, error: membershipError } = await supabase
        .from("group_members")
        .select("groupID")
        .eq("childID", childId);

    if (membershipError) {
        console.warn("⚠️ Failed to fetch group memberships for child schedule:", membershipError);
    }

    let activeGroupIds = [...new Set((membershipRows || [])
        .map((row) => row.groupID)
        .filter(Boolean))];

    // Fallback when group_members rows are missing/inconsistent for some children.
    if (activeGroupIds.length === 0) {
        const { data: snapshotRows, error: snapshotError } = await supabase
            .from("groups")
            .select("id")
            .contains("childIDs", [childId]);

        if (!snapshotError) {
            activeGroupIds = [...new Set((snapshotRows || []).map((row) => row.id).filter(Boolean))];
        }
    }

    // Extra fallback: derive group IDs from group-homework RPC if direct membership/snapshot
    // access is restricted by RLS in some environments.
    if (activeGroupIds.length === 0) {
        try {
            const { data: homeworkRows, error: homeworkRpcError } = await supabase.rpc(
                "get_parent_group_homeworks",
                { p_child_id: childId },
            );

            if (!homeworkRpcError && Array.isArray(homeworkRows)) {
                activeGroupIds = [...new Set(
                    homeworkRows
                        .map((row) => row?.groupID || row?.group_id)
                        .filter(Boolean),
                )];
            }
        } catch {
            // no-op
        }
    }

    let groupRows = [];
    if (activeGroupIds.length > 0) {
        let { data: groupsData, error: groupsError } = await supabase
            .from("groups")
            .select("id, subject, teacherName, lessonDays, lessonTimes, location, monthlyFee, teacherID, isActive")
            .in("id", activeGroupIds)
            .neq("isActive", false);

        // Fallback if schema differs and isActive filtering is not available.
        if (groupsError) {
            const fallback = await supabase
                .from("groups")
                .select("id, subject, lessonDays, lessonTimes, location, monthlyFee, teacherID")
                .in("id", activeGroupIds);

            groupsData = fallback.data;
            groupsError = fallback.error;
        }

        if (groupsError) {
            console.warn("⚠️ Failed to fetch groups for child schedule:", groupsError);
        } else {
            groupRows = groupsData || [];
        }
    }

    const teacherIds = [...new Set([
        ...(privateRows || []).map((row) => row.teacherID || row.teacherId),
        ...groupRows.map((row) => row.teacherID || row.teacherId),
    ].filter(Boolean))];
    let teachersById = {};

    if (teacherIds.length > 0) {
        const { data: teacherRows, error: teacherError } = await supabase
            .from("users")
            .select("id, name")
            .in("id", teacherIds);

        if (!teacherError) {
            teachersById = (teacherRows || []).reduce((accumulator, teacher) => {
                accumulator[teacher.id] = teacher.name;
                return accumulator;
            }, {});
        }
    }

    const normalizedPrivateRows = (privateRows || []).flatMap((row) => {
        const lessonDays = normalizeDayList(row.lessonDay);
        const daysToUse = lessonDays.length > 0 ? lessonDays : [null];
        const teacherId = row.teacherID || row.teacherId;
        const resolvedTeacherName =
            normalizeTeacherName(row.teacherName || row.teacher_name) ||
            normalizeTeacherName(teachersById[teacherId]) ||
            "غير محدد";

        return daysToUse.map((day, index) => ({
            id: `private-${row.id}-${index}`,
            childID: row.childID,
            subject: row.subject,
            lessonDay: day ? [day] : [],
            lessonTime: row.lessonTime,
            location: row.location,
            teacherName: resolvedTeacherName,
            teacherID: teacherId || null,
            date: nextDateForDayName(day),
            price: row.price,
            source: "private",
            privateLessonID: row.id,
        }));
    });

    const normalizedGroupRows = groupRows.flatMap((row) => {
        const lessonDays = normalizeDayList(row.lessonDays);
        const lessonTimes = normalizeTimeList(row.lessonTimes);
        const teacherId = row.teacherID || row.teacherId;
        const resolvedTeacherName =
            normalizeTeacherName(teachersById[teacherId]) ||
            normalizeTeacherName(row.teacherName || row.teacher_name) ||
            "غير محدد";

        const maxLen = Math.max(lessonDays.length, lessonTimes.length, 1);

        return Array.from({ length: maxLen }, (_, index) => {
            const day = lessonDays[index] || lessonDays[0] || null;
            const time = lessonTimes[index] || lessonTimes[0] || null;

            return {
                id: `group-${row.id}-${index}`,
                childID: childId,
                subject: row.subject,
                lessonDay: day ? [day] : [],
                lessonTime: time,
                location: row.location,
                teacherName: resolvedTeacherName,
                teacherID: teacherId || null,
                date: nextDateForDayName(day),
                price: row.price ?? row.monthlyFee ?? 0,
                source: "group",
                groupID: row.id,
            };
        });
    });

    const normalizedManualRows = (manualRows || []).map((row) => ({
        ...row,
        teacherName:
            normalizeTeacherName(row.teacherName || row.teacher_name) ||
            "غير محدد",
    }));

    return [...normalizedManualRows, ...normalizedPrivateRows, ...normalizedGroupRows].sort((a, b) => {
        const first = toSortStamp(a);
        const second = toSortStamp(b);
        return first.localeCompare(second);
    });
}

// Add one manual lesson for one child
export async function addManualLesson({
    childId,
    subject,
    lessonDay,
    lessonTime,
    teacherName,
    price,
    date,
    location = "غير محدد",
}) {
    const { error } = await supabase
        .from("manual_lessons")
        .insert([
            {
                childID: childId,
                subject,
                lessonDay: Array.isArray(lessonDay) ? lessonDay : [lessonDay],
                lessonTime,
                teacherName,
                price,
                date,
                location,
            },
        ]);

    if (error) throw error;
    return {
        childID: childId,
        subject,
        lessonDay: Array.isArray(lessonDay) ? lessonDay : [lessonDay],
        lessonTime,
        teacherName,
        price,
        date,
        location,
    };
}
