import { supabase } from "./supabase";

// Get homework list for one child through RPC (safe with RLS)
export async function getHomeworksByChildId(childId) {
    const { data, error } = await supabase.rpc("get_parent_homeworks", {
        p_child_id: childId,
    });

    if (error) throw error;
    return data || [];
}

// Get homework status rows for one child and a list of homework IDs
export async function getHomeworkStatusesByChildAndIds(childId, homeworkIds) {
    if (!childId || !Array.isArray(homeworkIds) || homeworkIds.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from("homework_submissions")
        .select("homeworkid, status, updated_at, submitted_at")
        .eq("childid", childId)
        .in("homeworkid", homeworkIds);

    if (error) throw error;

    return (data || []).map((row) => ({
        ...row,
        homeworkID: row.homeworkid,
    }));
}

// Add one homework for one child
// Note: homework table has no teacherName column, so we persist it inside description.
export async function addHomework({
    childId,
    title,
    description,
    dueDate,
    teacherName,
}) {
    const normalizedTeacher = (teacherName || "").trim();
    const descriptionWithTeacher = normalizedTeacher
        ? `__teacher:${normalizedTeacher}__\n${description}`
        : description;

    const { error } = await supabase.rpc("add_parent_homework", {
        p_child_id: childId,
        p_title: title,
        p_description: descriptionWithTeacher,
        p_due_date: dueDate,
    });

    if (error) throw error;

    return {
        childID: childId,
        title,
        description: descriptionWithTeacher,
        dueDate,
        teacherName: normalizedTeacher,
    };
}

// Delete one homework for one child
export async function deleteHomework({ homeworkId, childId }) {
    const { error } = await supabase.rpc("delete_parent_homework", {
        p_child_id: childId,
        p_homework_id: homeworkId,
    });

    if (error) throw error;

    return { id: homeworkId };
}
