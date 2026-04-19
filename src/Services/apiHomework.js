import { supabase } from "./supabase";

function normalizeHomeworkRow(row) {
    if (!row) return null;
    return {
        ...row,
        dueDate: row.dueDate || row.due_date || null,
        childID: row.childID || row.child_id || null,
        groupID: row.groupID || row.group_id || null,
        privateLessonID: row.privateLessonID || row.private_lesson_id || null,
        teacherName: row.teacherName || row.teacher_name || null,
        subject: row.subject || null,
    };
}

async function enrichHomeworkRowsWithTeacher(rows = []) {
    const normalizedRows = (rows || []).map((row) => normalizeHomeworkRow(row)).filter(Boolean);
    if (normalizedRows.length === 0) return [];

    const homeworkIds = normalizedRows.map((row) => row.id).filter(Boolean);
    let tableMetaById = {};

    if (homeworkIds.length > 0) {
        try {
            const { data: tableMetaRows, error: tableMetaError } = await supabase
                .from("homework")
                .select("id, groupID, privateLessonID")
                .in("id", homeworkIds);

            if (!tableMetaError) {
                tableMetaById = (tableMetaRows || []).reduce((accumulator, row) => {
                    accumulator[row.id] = row;
                    return accumulator;
                }, {});
            }
        } catch {
            // no-op
        }
    }

    const rowsWithMeta = normalizedRows.map((row) => {
        const meta = tableMetaById[row.id] || {};
        return {
            ...row,
            groupID: row.groupID || meta.groupID || null,
            privateLessonID: row.privateLessonID || meta.privateLessonID || null,
        };
    });

    const groupIds = [...new Set(rowsWithMeta.map((row) => row.groupID).filter(Boolean))];
    const privateLessonIds = [...new Set(rowsWithMeta.map((row) => row.privateLessonID).filter(Boolean))];

    let groupsById = {};
    if (groupIds.length > 0) {
        const { data: groupRows, error: groupError } = await supabase
            .from("groups")
            .select("id, subject, teacherID, teacherName")
            .in("id", groupIds);

        if (!groupError) {
            groupsById = (groupRows || []).reduce((accumulator, row) => {
                accumulator[row.id] = row;
                return accumulator;
            }, {});
        }
    }

    let privateById = {};
    if (privateLessonIds.length > 0) {
        const { data: privateRows, error: privateError } = await supabase
            .from("private_lessons")
            .select("id, subject, teacherID")
            .in("id", privateLessonIds);

        if (!privateError) {
            privateById = (privateRows || []).reduce((accumulator, row) => {
                accumulator[row.id] = row;
                return accumulator;
            }, {});
        }
    }

    const teacherIds = [
        ...new Set([
            ...Object.values(groupsById).map((group) => group.teacherID),
            ...Object.values(privateById).map((lesson) => lesson.teacherID),
        ].filter(Boolean)),
    ];

    let teacherNameById = {};
    if (teacherIds.length > 0) {
        const { data: teacherRows, error: teacherError } = await supabase
            .from("users")
            .select("id, name")
            .in("id", teacherIds);

        if (!teacherError) {
            teacherNameById = (teacherRows || []).reduce((accumulator, row) => {
                accumulator[row.id] = row.name;
                return accumulator;
            }, {});
        }
    }

    return rowsWithMeta.map((row) => {
        const group = row.groupID ? groupsById[row.groupID] : null;
        const privateLesson = row.privateLessonID
            ? privateById[row.privateLessonID]
            : null;
        const teacherId = group?.teacherID || privateLesson?.teacherID || null;

        return {
            ...row,
            subject: row.subject || group?.subject || privateLesson?.subject || null,
            teacherName:
                row.teacherName ||
                group?.teacherName ||
                teacherNameById[teacherId] ||
                null,
        };
    });
}

async function enrichRowsWithGroupInfo(childId, rows = []) {
    const normalizedRows = (rows || []).map((row) => normalizeHomeworkRow(row)).filter(Boolean);
    const rowsWithoutGroupInfo = normalizedRows.filter((row) => !Object.prototype.hasOwnProperty.call(row, "groupID"));

    if (!childId || normalizedRows.length === 0 || rowsWithoutGroupInfo.length === 0) {
        return normalizedRows;
    }

    const ids = normalizedRows.map((row) => row.id).filter(Boolean);
    if (ids.length === 0) return normalizedRows;

    try {
        const { data: metaRows, error: metaError } = await supabase
            .from("homework")
            .select("id, groupID")
            .eq("childID", childId)
            .in("id", ids);

        if (metaError) throw metaError;

        const groupById = (metaRows || []).reduce((accumulator, row) => {
            accumulator[row.id] = row.groupID || null;
            return accumulator;
        }, {});

        return normalizedRows.map((row) => ({
            ...row,
            groupID:
                Object.prototype.hasOwnProperty.call(row, "groupID") && row.groupID !== undefined
                    ? row.groupID
                    : (groupById[row.id] ?? null),
        }));
    } catch {
        return normalizedRows;
    }
}

// Get private/manual homework list for one child through RPC (safe with RLS)
export async function getPrivateHomeworksByChildId(childId) {
    const { data, error } = await supabase.rpc("get_parent_homeworks", {
        p_child_id: childId,
    });

    if (error) throw error;

    const enrichedRows = await enrichRowsWithGroupInfo(childId, data || []);
    const rowsWithTeacher = await enrichHomeworkRowsWithTeacher(enrichedRows);

    return rowsWithTeacher
        .filter((row) => !row?.groupID)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

// Get homework assigned through child groups (including group-wide homework with null childID)
export async function getGroupHomeworksByChildId(childId) {
    if (!childId) return [];

    // Prefer secure RPC to avoid parent-facing RLS issues on direct table reads.
    try {
        const { data: rpcRows, error: rpcError } = await supabase.rpc(
            "get_parent_group_homeworks",
            { p_child_id: childId },
        );

        if (!rpcError && Array.isArray(rpcRows)) {
            const rowsWithTeacher = await enrichHomeworkRowsWithTeacher(rpcRows || []);
            return rowsWithTeacher
                .filter(Boolean)
                .filter((row) => Boolean(row?.groupID))
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }
    } catch {
        // Fallback below.
    }

    let groupIds = [];

    const { data: memberships, error: membershipError } = await supabase
        .from("group_members")
        .select("groupID")
        .eq("childID", childId);

    if (!membershipError) {
        groupIds = (memberships || []).map((row) => row.groupID).filter(Boolean);
    }

    // Fallback: read groups snapshot if available.
    if (groupIds.length === 0) {
        const { data: groupsRows, error: groupsError } = await supabase
            .from("groups")
            .select("id")
            .contains("childIDs", [childId]);

        if (!groupsError) {
            groupIds = (groupsRows || []).map((row) => row.id).filter(Boolean);
        }
    }

    if (groupIds.length === 0) return [];

    const { data: homeworkRows, error: homeworkError } = await supabase
        .from("homework")
        .select("id, groupID, childID, title, description, dueDate, created_at")
        .in("groupID", groupIds)
        .or(`childID.is.null,childID.eq.${childId}`)
        .order("created_at", { ascending: false });

    if (homeworkError) throw homeworkError;

    // Protect UI from duplicate rows created previously by collapsing by logical content.
    const dedupedBySignature = new Map();
    (homeworkRows || []).forEach((row) => {
        const signature = [
            row.groupID || "",
            row.title || "",
            row.description || "",
            row.dueDate || "",
        ].join("__");

        const existing = dedupedBySignature.get(signature);
        if (!existing) {
            dedupedBySignature.set(signature, row);
            return;
        }

        // Prefer group-level row when available so behavior matches group-assigned homework model.
        if (!existing.childID && row.childID) return;
        if (existing.childID && !row.childID) {
            dedupedBySignature.set(signature, row);
            return;
        }

        if (new Date(row.created_at || 0) > new Date(existing.created_at || 0)) {
            dedupedBySignature.set(signature, row);
        }
    });

    const rowsWithTeacher = await enrichHomeworkRowsWithTeacher(
        Array.from(dedupedBySignature.values()),
    );

    return rowsWithTeacher
        .filter(Boolean)
        .filter((row) => Boolean(row?.groupID))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

// Get homework list for one child (merged)
export async function getHomeworksByChildId(childId) {
    const [privateRows, groupRows] = await Promise.all([
        getPrivateHomeworksByChildId(childId),
        getGroupHomeworksByChildId(childId).catch((groupHomeworkError) => {
            console.warn("⚠️ Could not fetch group homework directly:", groupHomeworkError);
            return [];
        }),
    ]);

    const mergedMap = new Map();
    [...privateRows, ...groupRows].forEach((row) => {
        if (!row?.id) return;
        mergedMap.set(row.id, row);
    });

    return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
}

// Keep compatibility for callers that still use merged data as the primary source.
export async function getHomeworksByChildIdLegacy(childId) {
    try {
        return await getHomeworksByChildId(childId);
    } catch (error) {
        console.warn("⚠️ Fallback to RPC-only homework list:", error);
        return getPrivateHomeworksByChildId(childId);
    }
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
