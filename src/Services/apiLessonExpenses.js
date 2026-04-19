import { supabase } from "./supabase";

const META_KEY = "lessonExpenseMeta";

function readMetaStore() {
    try {
        return JSON.parse(localStorage.getItem(META_KEY) || "{}");
    } catch {
        return {};
    }
}

function writeMetaStore(store) {
    localStorage.setItem(META_KEY, JSON.stringify(store));
}

export function getExpenseMeta(expenseId) {
    const store = readMetaStore();
    return store[expenseId] || null;
}

export function saveExpenseMeta(expenseId, meta) {
    const store = readMetaStore();
    store[expenseId] = meta;
    writeMetaStore(store);
}

function normalizeExpenseRow(row) {
    if (!row) return null;
    return {
        ...row,
        childID: row.childID || row.child_id || null,
        groupID: row.groupID || row.group_id || null,
        privateLessonID: row.privateLessonID || row.private_lesson_id || null,
        manualLessonID: row.manualLessonID || row.manual_lesson_id || null,
        paymentDate: row.paymentDate || row.payment_date || null,
        teacherID: row.teacherID || row.teacher_id || null,
        teacherName: row.teacherName || row.teacher_name || null,
        subject: row.subject || null,
    };
}

async function getGroupIdsForChild(childId) {
    const { data: membershipRows, error: membershipError } = await supabase
        .from("group_members")
        .select("groupID")
        .eq("childID", childId);

    if (!membershipError) {
        const groupIds = (membershipRows || []).map((row) => row.groupID).filter(Boolean);
        if (groupIds.length > 0) {
            return groupIds;
        }
    } else {
        console.warn("⚠️ Failed to fetch group memberships for lesson expenses:", membershipError);
    }

    const { data: snapshotRows, error: snapshotError } = await supabase
        .from("groups")
        .select("id")
        .contains("childIDs", [childId]);

    if (snapshotError) {
        console.warn("⚠️ Failed to fetch group snapshot for lesson expenses:", snapshotError);
    } else {
        const snapshotGroupIds = (snapshotRows || []).map((row) => row.id).filter(Boolean);
        if (snapshotGroupIds.length > 0) return snapshotGroupIds;
    }

    // Extra fallback: derive group IDs from group-homework RPC if available.
    try {
        const { data: homeworkRows, error: homeworkRpcError } = await supabase.rpc(
            "get_parent_group_homeworks",
            { p_child_id: childId },
        );

        if (!homeworkRpcError && Array.isArray(homeworkRows)) {
            return [...new Set(
                homeworkRows
                    .map((row) => row?.groupID || row?.group_id)
                    .filter(Boolean),
            )];
        }
    } catch {
        // no-op
    }

    return [];
}

// Get lesson expenses for one child through RPC
export async function getLessonExpensesByChildId(childId) {
    let rows = [];

    try {
        const { data, error } = await supabase.rpc("get_parent_lesson_expenses", {
            p_child_id: childId,
        });

        if (!error && Array.isArray(data) && data.length > 0) {
            rows = data.map((row) => normalizeExpenseRow(row)).filter(Boolean);
        }
    } catch {
        // Fallback below.
    }

    if (rows.length === 0) {
        const groupIds = await getGroupIdsForChild(childId);

        if (groupIds.length > 0) {
            const { data: fallbackRows, error: fallbackError } = await supabase
                .from("lesson_expenses")
                .select("id, childID, groupID, privateLessonID, manualLessonID, month, amount, status, paymentDate, created_at")
                .in("groupID", groupIds)
                .or(`childID.is.null,childID.eq.${childId}`)
                .order("created_at", { ascending: false });

            if (fallbackError) throw fallbackError;

            rows = (fallbackRows || []).map((row) => normalizeExpenseRow(row)).filter(Boolean);
        }
    }

    const expenseIdsNeedingMeta = rows
        .filter((row) => !row.groupID && !row.privateLessonID && !row.manualLessonID)
        .map((row) => row.id)
        .filter(Boolean);

    if (expenseIdsNeedingMeta.length > 0) {
        try {
            const { data: metaRows, error: metaError } = await supabase
                .from("lesson_expenses")
                .select("id, groupID, privateLessonID, manualLessonID")
                .in("id", expenseIdsNeedingMeta);

            if (!metaError) {
                const metaById = (metaRows || []).reduce((accumulator, row) => {
                    accumulator[row.id] = row;
                    return accumulator;
                }, {});

                for (let i = 0; i < rows.length; i += 1) {
                    const row = rows[i];
                    const meta = metaById[row.id] || {};
                    rows[i] = {
                        ...row,
                        groupID: row.groupID || meta.groupID || null,
                        privateLessonID: row.privateLessonID || meta.privateLessonID || null,
                        manualLessonID: row.manualLessonID || meta.manualLessonID || null,
                    };
                }
            }
        } catch {
            // no-op
        }
    }

    const groupIds = [...new Set(rows.map((row) => row.groupID).filter(Boolean))];
    const privateLessonIds = [...new Set(rows.map((row) => row.privateLessonID).filter(Boolean))];
    const manualLessonIds = [...new Set(rows.map((row) => row.manualLessonID).filter(Boolean))];

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

    let manualById = {};
    if (manualLessonIds.length > 0) {
        const { data: manualRows, error: manualError } = await supabase
            .from("manual_lessons")
            .select("id, subject, teacherName")
            .in("id", manualLessonIds);

        if (!manualError) {
            manualById = (manualRows || []).reduce((accumulator, row) => {
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

    return rows.map((row) => {
        const group = row.groupID ? groupsById[row.groupID] : null;
        const privateLesson = row.privateLessonID ? privateById[row.privateLessonID] : null;
        const manualLesson = row.manualLessonID ? manualById[row.manualLessonID] : null;
        const teacherId = group?.teacherID || privateLesson?.teacherID || null;

        return {
            ...row,
            subject: row.subject || group?.subject || privateLesson?.subject || manualLesson?.subject || null,
            teacherID: row.teacherID || teacherId || null,
            teacherName:
                row.teacherName ||
                group?.teacherName ||
                teacherNameById[teacherId] ||
                manualLesson?.teacherName ||
                null,
        };
    });
}

// Add one lesson expense for one child through RPC
export async function addLessonExpense({
    childId,
    month,
    amount,
    status,
    paymentDate,
}) {
    const { data, error } = await supabase.rpc("add_parent_lesson_expense", {
        p_amount: amount,
        p_child_id: childId,
        p_month: month,
        p_payment_date: paymentDate,
        p_status: status,
    });

    if (error) throw error;
    return data;
}

// Mark one lesson expense as paid
export async function markLessonExpensePaid({ expenseId, childId }) {
    const { error } = await supabase.rpc("mark_parent_lesson_expense_paid", {
        p_expense_id: expenseId,
        p_child_id: childId,
    });

    if (error) throw error;

    return { id: expenseId };
}

// Set one lesson expense status (paid/unpaid)
export async function setLessonExpenseStatus({
    expenseId,
    childId,
    status,
    paymentDate,
}) {
    const { error } = await supabase.rpc("set_parent_lesson_expense_status", {
        p_child_id: childId,
        p_expense_id: expenseId,
        p_status: status,
        p_payment_date: paymentDate,
    });

    if (error) throw error;

    return { id: expenseId, status };
}

// Set status by lesson reference (group/private/manual) and month.
// Creates expense row when missing, updates it when it already exists.
export async function setLessonExpenseStatusByLesson({
    childId,
    status,
    paymentDate,
    month,
    amount,
    groupID = null,
    privateLessonID = null,
    manualLessonID = null,
}) {
    const normalizedMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
    const normalizedStatus = status === "paid" ? "paid" : "unpaid";
    const normalizedPaymentDate =
        normalizedStatus === "paid" ? (paymentDate || new Date().toISOString()) : null;

    if (!groupID && !privateLessonID && !manualLessonID) {
        throw new Error("Lesson reference is required");
    }

    // Preferred path: secure RPC that upserts by lesson linkage.
    try {
        const { data, error } = await supabase.rpc(
            "set_parent_lesson_expense_status_by_lesson",
            {
                p_child_id: childId,
                p_group_id: groupID,
                p_private_lesson_id: privateLessonID,
                p_manual_lesson_id: manualLessonID,
                p_month: normalizedMonth,
                p_amount: Number(amount || 0),
                p_status: normalizedStatus,
                p_payment_date: normalizedPaymentDate,
            },
        );

        if (!error) {
            return { id: data, status: normalizedStatus };
        }
    } catch {
        // Fallback below.
    }

    // Fallback path for environments where RPC is not deployed yet.
    let findQuery = supabase
        .from("lesson_expenses")
        .select("id")
        .eq("childID", childId)
        .eq("month", normalizedMonth);

    if (groupID) {
        findQuery = findQuery.eq("groupID", groupID).is("privateLessonID", null).is("manualLessonID", null);
    } else if (privateLessonID) {
        findQuery = findQuery.eq("privateLessonID", privateLessonID).is("groupID", null).is("manualLessonID", null);
    } else {
        findQuery = findQuery.eq("manualLessonID", manualLessonID).is("groupID", null).is("privateLessonID", null);
    }

    const { data: existing, error: existingError } = await findQuery.maybeSingle();
    if (existingError) throw existingError;

    const payload = {
        childID: childId,
        groupID: groupID || null,
        privateLessonID: privateLessonID || null,
        manualLessonID: manualLessonID || null,
        month: normalizedMonth,
        amount: Number(amount || 0),
        status: normalizedStatus,
        paymentDate: normalizedPaymentDate,
    };

    if (existing?.id) {
        const { data, error } = await supabase
            .from("lesson_expenses")
            .update(payload)
            .eq("id", existing.id)
            .select("id")
            .single();

        if (error) throw error;
        return { id: data?.id || existing.id, status: normalizedStatus };
    }

    const { data, error } = await supabase
        .from("lesson_expenses")
        .insert(payload)
        .select("id")
        .single();

    if (error) throw error;
    return { id: data?.id, status: normalizedStatus };
}
