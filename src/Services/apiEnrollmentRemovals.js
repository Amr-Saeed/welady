import { supabase } from "./supabase";

async function getCurrentTeacherIdentity() {
    const {
        data: { session },
        error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) throw new Error("Not authenticated");

    const teacherId = session.user.id;

    const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("id", teacherId)
        .single();

    if (teacherError) throw teacherError;
    if (teacherUser?.role !== "teacher") {
        throw new Error("Only teachers can save removal history");
    }

    return {
        teacherId,
        teacherName: teacherUser?.name || "المدرس",
    };
}

export async function createEnrollmentRemoval({
    childId,
    parentId,
    removalType,
    reason,
    groupId = null,
    privateLessonId = null,
    metadata = null,
}) {
    const normalizedReason = String(reason || "").trim();
    if (!normalizedReason) {
        throw new Error("Removal reason is required");
    }

    const { teacherId, teacherName } = await getCurrentTeacherIdentity();

    const payload = {
        childID: childId,
        parentID: parentId,
        teacherID: teacherId,
        teacherName,
        removalType,
        groupID: removalType === "group" ? groupId : null,
        privateLessonID:
            removalType === "private_lesson" ? privateLessonId : null,
        reason: normalizedReason,
        metadata: metadata || {},
        removedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("enrollment_removals")
        .insert(payload)
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function getChildEnrollmentRemovals(childId) {
    const { data, error } = await supabase
        .from("enrollment_removals")
        .select(
            "id, childID, parentID, teacherID, teacherName, removalType, groupID, privateLessonID, reason, metadata, removedAt, created_at",
        )
        .eq("childID", childId)
        .order("removedAt", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getChildrenEnrollmentRemovals(childIds = []) {
    const ids = Array.isArray(childIds) ? childIds.filter(Boolean) : [];
    if (ids.length === 0) return [];

    const { data, error } = await supabase
        .from("enrollment_removals")
        .select(
            "id, childID, parentID, teacherID, teacherName, removalType, groupID, privateLessonID, reason, metadata, removedAt, created_at",
        )
        .in("childID", ids)
        .order("removedAt", { ascending: false });

    if (error) throw error;
    return data || [];
}
