import { supabase } from "./supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ARABIC_DAY_NAMES = [
    'الأحد',
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
];

function normalizeDayForComparison(dayValue) {
    if (typeof dayValue === 'number' && ARABIC_DAY_NAMES[dayValue]) {
        return ARABIC_DAY_NAMES[dayValue];
    }

    if (typeof dayValue !== 'string') return '';

    const trimmed = dayValue.trim();
    if (!trimmed) return '';

    const numericDay = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(numericDay) && String(numericDay) === trimmed && ARABIC_DAY_NAMES[numericDay]) {
        return ARABIC_DAY_NAMES[numericDay];
    }

    const lower = trimmed.toLowerCase();
    const englishToArabic = {
        sunday: 'الأحد',
        monday: 'الاثنين',
        tuesday: 'الثلاثاء',
        wednesday: 'الأربعاء',
        thursday: 'الخميس',
        friday: 'الجمعة',
        saturday: 'السبت',
    };

    return englishToArabic[lower] || trimmed;
}

function toMinutes(timeValue) {
    if (typeof timeValue !== 'string' || !timeValue.includes(':')) return null;
    const [hoursRaw, minutesRaw] = timeValue.split(':');
    const hours = Number.parseInt(hoursRaw, 10);
    const minutes = Number.parseInt(minutesRaw, 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
}

async function assertNoTeacherTimeConflict(teacherId, lessonDay, lessonTime) {
    const normalizedDays = (Array.isArray(lessonDay) ? lessonDay : [lessonDay])
        .map((day) => normalizeDayForComparison(day))
        .filter(Boolean);

    const lessonMinutes = toMinutes(lessonTime);
    if (normalizedDays.length === 0 || lessonMinutes === null) return;

    const { data: teacherGroups, error: groupsError } = await supabase
        .from('groups')
        .select('id, lessonDays, lessonTimes, lessonTimesEnds')
        .eq('teacherID', teacherId)
        .eq('isActive', true);

    if (groupsError) throw groupsError;

    const { data: privateLessons, error: privateLessonsError } = await supabase
        .from('private_lessons')
        .select('id, lessonDay, lessonTime')
        .eq('teacherID', teacherId)
        .eq('isActive', true);

    if (privateLessonsError) throw privateLessonsError;

    const groupSlots = (teacherGroups || []).flatMap((group) => {
        const days = Array.isArray(group.lessonDays) ? group.lessonDays : [];
        const starts = Array.isArray(group.lessonTimes) ? group.lessonTimes : [];
        const ends = Array.isArray(group.lessonTimesEnds) ? group.lessonTimesEnds : [];

        return days.map((day, index) => ({
            day: normalizeDayForComparison(day),
            startTime: starts[index] || null,
            endTime: ends[index] || null,
            startMinutes: toMinutes(starts[index]),
            endMinutes: toMinutes(ends[index]),
        })).filter((slot) => slot.day && slot.startMinutes !== null && slot.endMinutes !== null && slot.endMinutes > slot.startMinutes);
    });

    const privateSlots = (privateLessons || []).flatMap((lesson) => {
        const days = Array.isArray(lesson.lessonDay)
            ? lesson.lessonDay
            : lesson.lessonDay
                ? [lesson.lessonDay]
                : [];

        return days.map((day) => ({
            day: normalizeDayForComparison(day),
            time: lesson.lessonTime || null,
            minutes: toMinutes(lesson.lessonTime),
        })).filter((slot) => slot.day && slot.minutes !== null);
    });

    for (const day of normalizedDays) {
        for (const groupSlot of groupSlots) {
            if (groupSlot.day !== day) continue;

            if (lessonMinutes >= groupSlot.startMinutes && lessonMinutes < groupSlot.endMinutes) {
                throw new Error(`يوجد تعارض مع مجموعة يوم ${day} بين ${groupSlot.startTime} و${groupSlot.endTime}`);
            }
        }

        for (const privateSlot of privateSlots) {
            if (privateSlot.day !== day) continue;

            if (privateSlot.minutes === lessonMinutes) {
                throw new Error(`يوجد تعارض مع درس خصوصي يوم ${day} الساعة ${lessonTime}`);
            }
        }
    }
}

// ============================================================================
// TEACHER CHILDREN MANAGEMENT (PRIVATE LESSONS)
// ============================================================================

/**
 * Search for child by student code
 * Parent shares this code (e.g., AB34K9) with teacher
 */
export async function searchChildByCode(studentCode) {
    try {
        console.log("🔍 Searching for child with code:", studentCode);

        const { data, error } = await supabase
            .rpc('search_child_by_code', { p_student_code: studentCode.toUpperCase() });

        if (error) {
            if (error.code === 'PGRST116') {
                throw new Error("الكود غير صحيح - لا يوجد طالب بهذا الكود");
            }
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error("الكود غير صحيح - لا يوجد طالب بهذا الكود");
        }

        console.log("✅ Child found:", data[0]);
        return data[0];
    } catch (error) {
        console.error("❌ Error searching for child:", error);
        throw error;
    }
}

/**
 * Get all children taught by current teacher (from private lessons)
 */
export async function getTeacherChildren() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("Not authenticated");

        const teacher_id = session.user.id;

        // Get unique children from private lessons
        const { data, error } = await supabase
            .from('private_lessons')
            .select(`
                id,
                childID,
                subject,
                grade,
                lessonDay,
                lessonTime,
                location,
                price,
                isActive,
                children!childID(id, name, grade, studentCode, parentID),
                homework:homework(id, childID, privateLessonID, title, description, dueDate, created_at)
            `)
            .eq('teacherID', teacher_id)
            .eq('isActive', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log("✅ Teacher children/lessons fetched:", data);
        return data;
    } catch (error) {
        console.error("❌ Error fetching teacher children:", error);
        throw error;
    }
}

/**
 * Get private lesson details
 */
export async function getPrivateLessonById(lessonId) {
    try {
        const { data, error } = await supabase
            .from('private_lessons')
            .select(`
                *,
                children!childID(id, name, grade, studentCode),
                homework(*)
            `)
            .eq('id', lessonId)
            .single();

        if (error) throw error;

        console.log("✅ Private lesson fetched:", data);
        return data;
    } catch (error) {
        console.error("❌ Error fetching lesson:", error);
        throw error;
    }
}

/**
 * Create a private lesson for a child
 */
export async function createPrivateLesson({
    childId,
    subject,
    grade,
    lessonDay,
    lessonTime,
    location,
    price,
}) {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("Not authenticated");

        const teacherId = session.user.id;

        const { data: existingLesson, error: existingError } = await supabase
            .from('private_lessons')
            .select('id')
            .eq('teacherID', teacherId)
            .eq('childID', childId)
            .eq('isActive', true)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existingLesson?.id) {
            throw new Error('هذا الطالب مضاف بالفعل في الدروس الخصوصية');
        }

        const normalizedLessonDay = Array.isArray(lessonDay)
            ? lessonDay
            : lessonDay
                ? [lessonDay]
                : [];

        await assertNoTeacherTimeConflict(teacherId, normalizedLessonDay, lessonTime);

        const payload = {
            teacherID: teacherId,
            childID: childId,
            subject,
            grade,
            lessonDay: normalizedLessonDay,
            lessonTime,
            location: location || "غير محدد",
            price: Number(price || 0),
            isActive: true,
        };

        const { data, error } = await supabase
            .from('private_lessons')
            .insert(payload)
            .select('*')
            .single();

        if (error) throw error;

        console.log("✅ Private lesson created:", data);
        return data;
    } catch (error) {
        console.error("❌ Error creating private lesson:", error);
        throw error;
    }
}

/**
 * Remove a private lesson/student from teacher lessons
 */
export async function removePrivateLesson(lessonId) {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("Not authenticated");

        const teacherId = session.user.id;

        const { error } = await supabase
            .from('private_lessons')
            .delete()
            .eq('id', lessonId)
            .eq('teacherID', teacherId);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error("❌ Error removing private lesson:", error);
        throw error;
    }
}

/**
 * Assign homework to a private lesson
 */
export async function assignHomeworkToLesson(
    privateLessonId,
    childId,
    title,
    description = "",
    dueDate = null
) {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("Not authenticated");

        console.log("📝 Assigning homework to lesson:", privateLessonId);

        const { data, error } = await supabase
            .from('homework')
            .insert({
                privateLessonID: privateLessonId,
                childID: childId,
                title,
                description,
                dueDate,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        console.log("✅ Homework assigned:", data);
        return data;
    } catch (error) {
        console.error("❌ Error assigning homework:", error);
        throw error;
    }
}

/**
 * Get all homework for a child
 */
export async function getChildHomework(childId) {
    try {
        console.log("📚 Fetching homework for child:", childId);

        const { data, error } = await supabase
            .from('homework')
            .select(`
                *,
                private_lessons(id, subject, lessonDay, lessonTime)
            `)
            .eq('childID', childId)
            .order('dueDate', { ascending: true });

        if (error) throw error;

        console.log("✅ Child homework fetched:", data);
        return data;
    } catch (error) {
        console.error("❌ Error fetching homework:", error);
        throw error;
    }
}

/**
 * Get all homework for a lesson
 */
export async function getLessonHomework(lessonId) {
    try {
        const { data, error } = await supabase
            .from('homework')
            .select('*')
            .eq('privateLessonID', lessonId)
            .order('dueDate', { ascending: true });

        if (error) throw error;

        console.log("✅ Lesson homework fetched:", data);
        return data;
    } catch (error) {
        console.error("❌ Error fetching lesson homework:", error);
        throw error;
    }
}

/**
 * Delete homework
 */
export async function deleteHomework(homeworkId) {
    try {
        const { error } = await supabase
            .from('homework')
            .delete()
            .eq('id', homeworkId);

        if (error) throw error;

        console.log("✅ Homework deleted");
        return true;
    } catch (error) {
        console.error("❌ Error deleting homework:", error);
        throw error;
    }
}

/**
 * Update homework details (title/description/due date)
 */
export async function updateHomework(homeworkId, updates) {
    try {
        const payload = {
            title: updates?.title,
            description: updates?.description || "",
            dueDate: updates?.dueDate || null,
        };

        const { data, error } = await supabase
            .from('homework')
            .update(payload)
            .eq('id', homeworkId)
            .select()
            .single();

        if (error) throw error;

        console.log("✅ Homework updated:", data);
        return data;
    } catch (error) {
        console.error("❌ Error updating homework:", error);
        throw error;
    }
}

/**
 * Get status rows for multiple homework items
 */
export async function getHomeworkStatusesByIds(homeworkIds = []) {
    try {
        if (!Array.isArray(homeworkIds) || homeworkIds.length === 0) return [];

        const { data, error } = await supabase
            .from('homework_submissions')
            .select('homeworkid, childid, status, submitted_at, updated_at')
            .in('homeworkid', homeworkIds);

        if (error) throw error;

        return (data || []).map((row) => ({
            homeworkID: row.homeworkid,
            childID: row.childid,
            status: row.status,
            submittedAt: row.submitted_at,
            updatedAt: row.updated_at,
        }));
    } catch (error) {
        console.error("❌ Error fetching homework statuses:", error);
        throw error;
    }
}

/**
 * Set attendance decision for a private lesson student
 */
export async function setPrivateLessonAttendanceStatus({ childId, lesson, status }) {
    const normalizedStatus =
        status === "teacher_canceled" || status === "child_canceled"
            ? status
            : "child_canceled";

    const lessonId = lesson?.id;
    if (!lessonId || !childId) throw new Error("Invalid lesson/child for attendance");

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) throw new Error("Not authenticated");

    const teacherId = session.user.id;

    const { data: ownLesson, error: ownLessonError } = await supabase
        .from("private_lessons")
        .select("id")
        .eq("id", lessonId)
        .eq("teacherID", teacherId)
        .maybeSingle();

    if (ownLessonError) throw ownLessonError;
    if (!ownLesson?.id) throw new Error("Unauthorized private lesson access");

    const payload = {
        privateLessonID: lessonId,
        childID: childId,
        teacherID: teacherId,
        status: normalizedStatus,
        marked_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("private_lesson_attendance_status")
        .upsert(payload, { onConflict: "privateLessonID,childID" })
        .select("id, privateLessonID, childID, status, marked_at, updated_at")
        .single();

    if (error) throw error;
    return data;
}

/**
 * Read saved attendance decisions for multiple private lesson rows
 */
export async function getPrivateLessonAttendanceStatuses(lessonRows = []) {
    const rows = Array.isArray(lessonRows) ? lessonRows.filter(Boolean) : [];
    const lessonIds = rows.map((row) => row.id).filter(Boolean);

    if (lessonIds.length === 0) return {};

    const { data, error } = await supabase
        .from("private_lesson_attendance_status")
        .select("privateLessonID, childID, status")
        .in("privateLessonID", lessonIds);

    if (error) throw error;

    const statusMap = {};
    (data || []).forEach((row) => {
        const key = `${row.privateLessonID}__${row.childID}`;
        statusMap[key] = row.status;
    });

    return rows.reduce((accumulator, row) => {
        const key = `${row.id}__${row.childID}`;
        accumulator[row.id] = statusMap[key] || null;
        return accumulator;
    }, {});
}

/**
 * Build homework analytics for one child inside one private lesson
 */
export async function getPrivateLessonChildHomeworkAnalytics(lessonId, childId) {
    try {
        const { data: homeworkRows, error: homeworkError } = await supabase
            .from("homework")
            .select("id, title, description, dueDate, created_at, childID")
            .eq("privateLessonID", lessonId)
            .or(`childID.is.null,childID.eq.${childId}`)
            .order("created_at", { ascending: false });

        if (homeworkError) throw homeworkError;

        const homeworkIds = (homeworkRows || []).map((row) => row.id);
        let statusByHomeworkId = {};

        if (homeworkIds.length > 0) {
            const { data: statusRows, error: statusError } = await supabase
                .from("homework_submissions")
                .select("homeworkid, childid, status, updated_at, submitted_at")
                .eq("childid", childId)
                .in("homeworkid", homeworkIds);

            if (statusError) throw statusError;

            statusByHomeworkId = (statusRows || []).reduce((accumulator, row) => {
                accumulator[row.homeworkid] = row;
                return accumulator;
            }, {});
        }

        const normalizeHomeworkStatus = (status) => {
            if (status === "done") return "done";
            if (status === "not_done") return "not_done";
            return "pending";
        };

        const items = (homeworkRows || []).map((row) => {
            const statusRow = statusByHomeworkId[row.id];
            return {
                id: row.id,
                title: row.title,
                description: row.description,
                due_date: row.dueDate || null,
                created_at: row.created_at,
                is_individual: Boolean(row.childID),
                status: normalizeHomeworkStatus(statusRow?.status),
                updated_at: statusRow?.updated_at || null,
                submitted_at: statusRow?.submitted_at || null,
            };
        });

        const summary = {
            total: items.length,
            done: items.filter((item) => item.status === "done").length,
            not_done: items.filter((item) => item.status === "not_done").length,
            pending: items.filter((item) => item.status === "pending").length,
        };

        return { summary, items };
    } catch (error) {
        console.error("Error getting private lesson homework analytics:", error);
        throw error;
    }
}

/**
 * Build attendance analytics for one child in one private lesson
 */
export async function getPrivateLessonChildAttendanceAnalytics(lessonId, childId) {
    const { data, error } = await supabase
        .from("private_lesson_attendance_status")
        .select("id, status, marked_at, updated_at")
        .eq("privateLessonID", lessonId)
        .eq("childID", childId)
        .order("updated_at", { ascending: false });

    if (error) throw error;

    const rows = (data || []).map((row) => ({
        id: row.id,
        status: row.status,
        updatedAt: row.updated_at || row.marked_at,
    }));

    const summary = {
        total: rows.length,
        teacher_canceled: rows.filter((row) => row.status === "teacher_canceled")
            .length,
        child_canceled: rows.filter((row) => row.status === "child_canceled").length,
    };

    return { summary, items: rows };
}

/**
 * Update homework status
 */
export async function updateHomeworkStatus(homeworkId, status) {
    try {
        const normalized = String(status || '').toLowerCase();
        const normalizedStatus =
            normalized === 'completed' || normalized === 'submitted' || normalized === 'returned' || normalized === 'done'
                ? 'done'
                : normalized === 'not_done' || normalized === 'missing'
                    ? 'not_done'
                    : 'pending';

        const { data: homeworkRow, error: homeworkError } = await supabase
            .from('homework')
            .select('id, childID')
            .eq('id', homeworkId)
            .single();

        if (homeworkError) throw homeworkError;
        if (!homeworkRow?.childID) {
            throw new Error('لا يمكن تحديث الحالة: هذا الواجب غير مرتبط بطالب محدد');
        }

        const nowIso = new Date().toISOString();

        const { data: existingRow, error: existingError } = await supabase
            .from('homework_submissions')
            .select('id')
            .eq('homeworkid', homeworkId)
            .eq('childid', homeworkRow.childID)
            .maybeSingle();

        if (existingError) throw existingError;

        let data;
        if (existingRow?.id) {
            const { data: updatedRow, error } = await supabase
                .from('homework_submissions')
                .update({
                    status: normalizedStatus,
                    submitted_at: normalizedStatus === 'done' ? nowIso : null,
                    updated_at: nowIso,
                })
                .eq('id', existingRow.id)
                .select()
                .single();

            if (error) throw error;
            data = updatedRow;
        } else {
            const { data: insertedRow, error } = await supabase
                .from('homework_submissions')
                .insert({
                    homeworkid: homeworkId,
                    childid: homeworkRow.childID,
                    status: normalizedStatus,
                    submitted_at: normalizedStatus === 'done' ? nowIso : null,
                    updated_at: nowIso,
                })
                .select()
                .single();

            if (error) throw error;
            data = insertedRow;
        }

        console.log("✅ Homework status updated:", data);
        return data;
    } catch (error) {
        console.error("❌ Error updating status:", error);
        throw error;
    }
}

// ============================================================================
// REACT QUERY HOOKS (For easy use in components)
// ============================================================================

/**
 * Hook: Search for child by code
 */
export function useSearchChildByCode() {
    return useMutation({
        mutationFn: (code) => searchChildByCode(code),
    });
}

/**
 * Hook: Get all children taught by teacher
 */
export function useTeacherChildren() {
    return useQuery({
        queryKey: ["teacherChildren"],
        queryFn: getTeacherChildren,
        retry: 1,
    });
}

/**
 * Hook: Get specific private lesson
 */
export function usePrivateLesson(lessonId) {
    return useQuery({
        queryKey: ["privateLesson", lessonId],
        queryFn: () => getPrivateLessonById(lessonId),
        enabled: !!lessonId,
        retry: 1,
    });
}

/**
 * Hook: Get homework for a child
 */
export function useChildHomework(childId) {
    return useQuery({
        queryKey: ["childHomework", childId],
        queryFn: () => getChildHomework(childId),
        enabled: !!childId,
        retry: 1,
    });
}

/**
 * Hook: Get homework for a lesson
 */
export function useLessonHomework(lessonId) {
    return useQuery({
        queryKey: ["lessonHomework", lessonId],
        queryFn: () => getLessonHomework(lessonId),
        enabled: !!lessonId,
        retry: 1,
    });
}

/**
 * Hook: Assign homework
 */
export function useAssignHomework() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ lessonId, childId, title, description, dueDate }) =>
            assignHomeworkToLesson(lessonId, childId, title, description, dueDate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lessonHomework"] });
            queryClient.invalidateQueries({ queryKey: ["childHomework"] });
        },
    });
}

/**
 * Hook: Create private lesson for a child
 */
export function useCreatePrivateLesson() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createPrivateLesson,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["teacherChildren"] });
            if (variables?.childId) {
                queryClient.invalidateQueries({
                    queryKey: ["manualLessons", variables.childId],
                });
            }
        },
    });
}

/**
 * Hook: Remove private lesson
 */
export function useRemovePrivateLesson() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removePrivateLesson,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacherChildren"] });
            queryClient.invalidateQueries({ queryKey: ["lessonHomework"] });
            queryClient.invalidateQueries({ queryKey: ["childHomework"] });
        },
    });
}

/**
 * Hook: Update homework details
 */
export function useUpdateHomework() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }) => updateHomework(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lessonHomework"] });
            queryClient.invalidateQueries({ queryKey: ["childHomework"] });
            queryClient.invalidateQueries({ queryKey: ["teacherChildren"] });
        },
    });
}

/**
 * Hook: Delete homework
 */
export function useDeleteHomework() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteHomework,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lessonHomework"] });
            queryClient.invalidateQueries({ queryKey: ["childHomework"] });
            queryClient.invalidateQueries({ queryKey: ["teacherChildren"] });
        },
    });
}

/**
 * Hook: Update homework status
 */
export function useUpdateHomeworkStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }) => updateHomeworkStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["childHomework"] });
            queryClient.invalidateQueries({ queryKey: ["lessonHomework"] });
            queryClient.invalidateQueries({ queryKey: ["teacherChildren"] });
            queryClient.invalidateQueries({ queryKey: ["homeworkStatuses"] });
        },
    });
}

/**
 * Hook: Get homework status rows for a list of homework IDs
 */
export function useHomeworkStatuses(homeworkIds = []) {
    return useQuery({
        queryKey: ["homeworkStatuses", [...homeworkIds].sort().join("|")],
        queryFn: () => getHomeworkStatusesByIds(homeworkIds),
        enabled: Array.isArray(homeworkIds) && homeworkIds.length > 0,
    });
}

/**
 * Hook: Get private attendance statuses mapped by lessonId
 */
export function usePrivateLessonAttendanceStatuses(lessons = []) {
    return useQuery({
        queryKey: [
            "privateLessonAttendanceStatuses",
            (lessons || []).map((lesson) => `${lesson?.id}:${lesson?.childID}`).sort().join("|"),
        ],
        queryFn: () => getPrivateLessonAttendanceStatuses(lessons),
        enabled: Array.isArray(lessons) && lessons.length > 0,
    });
}
