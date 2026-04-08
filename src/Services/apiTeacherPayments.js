import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

function currentMonthStart() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

async function getTeacherId() {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) throw new Error("Not authenticated");
    return session.user.id;
}

export async function getGroupPayments(groupId) {
    const month = currentMonthStart();
    const teacherId = await getTeacherId();

    const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("id, subject, grade, monthlyFee")
        .eq("id", groupId)
        .eq("teacherID", teacherId)
        .single();

    if (groupError) throw groupError;

    const { data: members, error: membersError } = await supabase
        .from("group_members")
        .select("id, childID, children!childID(id, name)")
        .eq("groupID", groupId);

    if (membersError) throw membersError;

    const childIds = (members || []).map((m) => m.childID).filter(Boolean);

    let expenseRows = [];
    if (childIds.length > 0) {
        const { data, error } = await supabase
            .from("lesson_expenses")
            .select("id, childID, groupID, amount, status, month, paymentDate")
            .eq("groupID", groupId)
            .eq("month", month)
            .in("childID", childIds);

        if (error) throw error;
        expenseRows = data || [];
    }

    const expenseByChild = (expenseRows || []).reduce((acc, row) => {
        acc[row.childID] = row;
        return acc;
    }, {});

    const groupTitle =
        group?.subject && group?.grade
            ? `${group.subject} - ${group.grade}`
            : group?.subject || "مجموعة";

    const rows = (members || []).map((member) => {
        const expense = expenseByChild[member.childID];

        return {
            key: `group-${groupId}-${member.childID}`,
            mode: "group",
            month,
            childID: member.childID,
            childName: member.children?.name || "طالب",
            groupID: groupId,
            privateLessonID: null,
            amount: Number(expense?.amount ?? group.monthlyFee ?? 0),
            status: expense?.status || "unpaid",
            hasRecordedStatus: Boolean(expense?.id),
            paymentDate: expense?.paymentDate || null,
            dbExpenseId: expense?.id || null,
            title: groupTitle,
        };
    });

    return {
        month,
        rows,
    };
}

export async function getPrivateLessonPayments() {
    const month = currentMonthStart();
    const teacherId = await getTeacherId();

    const { data: lessons, error: lessonsError } = await supabase
        .from("private_lessons")
        .select("id, teacherID, childID, subject, price, children!childID(id, name)")
        .eq("teacherID", teacherId)
        .eq("isActive", true)
        .order("created_at", { ascending: false });

    if (lessonsError) throw lessonsError;

    const lessonIds = (lessons || []).map((l) => l.id);
    let expenseRows = [];

    if (lessonIds.length > 0) {
        const { data, error } = await supabase
            .from("lesson_expenses")
            .select("id, childID, privateLessonID, amount, status, month, paymentDate")
            .eq("month", month)
            .in("privateLessonID", lessonIds);

        if (error) throw error;
        expenseRows = data || [];
    }

    const expenseByLessonAndChild = (expenseRows || []).reduce((acc, row) => {
        const key = `${row.privateLessonID}__${row.childID}`;
        acc[key] = row;
        return acc;
    }, {});

    const rows = (lessons || []).map((lesson) => {
        const key = `${lesson.id}__${lesson.childID}`;
        const expense = expenseByLessonAndChild[key];

        return {
            key: `private-${lesson.id}-${lesson.childID}`,
            mode: "private_lesson",
            month,
            childID: lesson.childID,
            childName: lesson.children?.name || "طالب",
            groupID: null,
            privateLessonID: lesson.id,
            amount: Number(expense?.amount ?? lesson.price ?? 0),
            status: expense?.status || "unpaid",
            hasRecordedStatus: Boolean(expense?.id),
            paymentDate: expense?.paymentDate || null,
            dbExpenseId: expense?.id || null,
            title: lesson.subject || "درس خصوصي",
        };
    });

    return {
        month,
        rows,
    };
}

export async function setTeacherPaymentStatus({
    mode,
    childID,
    groupID = null,
    privateLessonID = null,
    amount,
    month,
    status,
}) {
    const teacherId = await getTeacherId();
    const effectiveMonth = month || currentMonthStart();
    const normalizedStatus = status === "paid" ? "paid" : "unpaid";

    if (!childID) throw new Error("childID is required");

    if (mode === "group") {
        const { data: ownGroup, error: ownGroupError } = await supabase
            .from("groups")
            .select("id")
            .eq("id", groupID)
            .eq("teacherID", teacherId)
            .maybeSingle();

        if (ownGroupError) throw ownGroupError;
        if (!ownGroup?.id) throw new Error("Unauthorized group access");
    } else {
        const { data: ownPrivate, error: ownPrivateError } = await supabase
            .from("private_lessons")
            .select("id")
            .eq("id", privateLessonID)
            .eq("teacherID", teacherId)
            .maybeSingle();

        if (ownPrivateError) throw ownPrivateError;
        if (!ownPrivate?.id) throw new Error("Unauthorized private lesson access");
    }

    let findQuery = supabase
        .from("lesson_expenses")
        .select("id")
        .eq("childID", childID)
        .eq("month", effectiveMonth);

    if (mode === "group") {
        findQuery = findQuery.eq("groupID", groupID).is("privateLessonID", null);
    } else {
        findQuery = findQuery
            .eq("privateLessonID", privateLessonID)
            .is("groupID", null);
    }

    const { data: existing, error: existingError } = await findQuery.maybeSingle();
    if (existingError) throw existingError;

    const payload = {
        childID,
        groupID: mode === "group" ? groupID : null,
        privateLessonID: mode === "private_lesson" ? privateLessonID : null,
        month: effectiveMonth,
        amount: Number(amount || 0),
        status: normalizedStatus,
        paymentDate: normalizedStatus === "paid" ? new Date().toISOString() : null,
    };

    if (existing?.id) {
        const { data, error } = await supabase
            .from("lesson_expenses")
            .update(payload)
            .eq("id", existing.id)
            .select("*")
            .single();

        if (error) throw error;
        return data;
    }

    const { data, error } = await supabase
        .from("lesson_expenses")
        .insert(payload)
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export function useGroupPayments(groupId) {
    return useQuery({
        queryKey: ["groupPayments", groupId],
        queryFn: () => getGroupPayments(groupId),
        enabled: !!groupId,
        retry: 1,
    });
}

export function usePrivateLessonPayments() {
    return useQuery({
        queryKey: ["privateLessonPayments"],
        queryFn: getPrivateLessonPayments,
        retry: 1,
    });
}

export function useSetTeacherPaymentStatus(invalidateKeys = []) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: setTeacherPaymentStatus,
        onSuccess: () => {
            invalidateKeys.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
            queryClient.invalidateQueries({ queryKey: ["teacherAnalytics"] });
        },
    });
}
