import { supabase } from "./supabase";

function sumAmount(rows = []) {
    return rows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
}

function percentage(value, total) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
}

function normalizeDayList(dayValue) {
    if (Array.isArray(dayValue)) return dayValue.filter(Boolean);
    if (typeof dayValue === "string" && dayValue.trim()) return [dayValue.trim()];
    return [];
}

function buildSortedDistribution(mapObject, limit = null) {
    const rows = Object.entries(mapObject)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    if (limit && rows.length > limit) return rows.slice(0, limit);
    return rows;
}

function currentMonthStart() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

async function getTeacherIdFromSession() {
    const {
        data: { session },
        error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) throw new Error("Not authenticated");
    return session.user.id;
}

export async function getTeacherAnalytics() {
    const teacherId = await getTeacherIdFromSession();

    const activeMonth = currentMonthStart();

    const [groupsResult, privateResult] = await Promise.all([
        supabase
            .from("groups")
            .select("id, grade, subject, monthlyFee, lessonDays")
            .eq("teacherID", teacherId)
            .eq("isActive", true),
        supabase
            .from("private_lessons")
            .select("id, childID, grade, subject, price, lessonDay, children!childID(id, name)")
            .eq("teacherID", teacherId)
            .eq("isActive", true),
    ]);

    if (groupsResult.error) throw groupsResult.error;
    if (privateResult.error) throw privateResult.error;

    const groups = groupsResult.data || [];
    const privateLessons = privateResult.data || [];

    const groupIds = groups.map((group) => group.id);
    const privateLessonIds = privateLessons.map((lesson) => lesson.id);

    let groupMembers = [];
    if (groupIds.length > 0) {
        const { data, error } = await supabase
            .from("group_members")
            .select("groupID, childID, children!childID(id, name)")
            .in("groupID", groupIds);

        if (error) throw error;
        groupMembers = data || [];
    }

    const groupStudentsCount = groupMembers.length;
    const uniquePrivateStudentCount = new Set(
        privateLessons.map((lesson) => lesson.childID).filter(Boolean),
    ).size;
    const totalStudents = groupStudentsCount + uniquePrivateStudentCount;

    let expenses = [];
    if (groupIds.length > 0 || privateLessonIds.length > 0) {
        let query = supabase
            .from("lesson_expenses")
            .select("id, childID, groupID, privateLessonID, amount, status, month, paymentDate")
            .eq("status", "paid");

        if (groupIds.length > 0 && privateLessonIds.length > 0) {
            query = query.or(
                `groupID.in.(${groupIds.join(",")}),privateLessonID.in.(${privateLessonIds.join(",")})`,
            );
        } else if (groupIds.length > 0) {
            query = query.in("groupID", groupIds);
        } else {
            query = query.in("privateLessonID", privateLessonIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        expenses = data || [];
    }

    const groupIncomeRows = expenses.filter(
        (row) => row.groupID && groupIds.includes(row.groupID),
    );
    const privateIncomeRows = expenses.filter(
        (row) => row.privateLessonID && privateLessonIds.includes(row.privateLessonID),
    );

    const groupIncome = sumAmount(groupIncomeRows);
    const privateIncome = sumAmount(privateIncomeRows);
    const totalIncome = groupIncome + privateIncome;

    const gradeMap = {};
    const groupMembersByGroupId = groupMembers.reduce((acc, row) => {
        const key = row.groupID;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    groups.forEach((group) => {
        const grade = group.grade || "غير محدد";
        const membersCount = groupMembersByGroupId[group.id] || 0;
        gradeMap[grade] = (gradeMap[grade] || 0) + membersCount;
    });

    privateLessons.forEach((lesson) => {
        const grade = lesson.grade || "غير محدد";
        gradeMap[grade] = (gradeMap[grade] || 0) + 1;
    });

    const subjectMap = {};
    groups.forEach((group) => {
        const subject = group.subject || "بدون مادة";
        const membersCount = groupMembersByGroupId[group.id] || 0;
        subjectMap[subject] = (subjectMap[subject] || 0) + membersCount;
    });
    privateLessons.forEach((lesson) => {
        const subject = lesson.subject || "بدون مادة";
        subjectMap[subject] = (subjectMap[subject] || 0) + 1;
    });

    const dayMap = {};
    groups.forEach((group) => {
        normalizeDayList(group.lessonDays).forEach((day) => {
            dayMap[day] = (dayMap[day] || 0) + 1;
        });
    });
    privateLessons.forEach((lesson) => {
        normalizeDayList(lesson.lessonDay).forEach((day) => {
            dayMap[day] = (dayMap[day] || 0) + 1;
        });
    });

    const monthMap = {};
    expenses.forEach((row) => {
        const key = String(row.month || row.paymentDate || "").slice(0, 7) || "غير محدد";
        monthMap[key] = (monthMap[key] || 0) + Number(row.amount || 0);
    });

    const monthlyIncome = Object.entries(monthMap)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));

    let currentMonthExpenses = [];
    if (groupIds.length > 0 || privateLessonIds.length > 0) {
        let currentMonthQuery = supabase
            .from("lesson_expenses")
            .select("id, childID, groupID, privateLessonID, amount, status, month")
            .eq("month", activeMonth);

        if (groupIds.length > 0 && privateLessonIds.length > 0) {
            currentMonthQuery = currentMonthQuery.or(
                `groupID.in.(${groupIds.join(",")}),privateLessonID.in.(${privateLessonIds.join(",")})`,
            );
        } else if (groupIds.length > 0) {
            currentMonthQuery = currentMonthQuery.in("groupID", groupIds);
        } else {
            currentMonthQuery = currentMonthQuery.in("privateLessonID", privateLessonIds);
        }

        const { data, error } = await currentMonthQuery;
        if (error) throw error;
        currentMonthExpenses = data || [];
    }

    const expenseByKey = new Map();
    for (const row of currentMonthExpenses) {
        const key = `${row.groupID || ""}__${row.privateLessonID || ""}__${row.childID || ""}__${row.month || ""}`;
        expenseByKey.set(key, row);
    }

    const groupsById = groups.reduce((acc, group) => {
        acc[group.id] = group;
        return acc;
    }, {});

    const groupPaymentRows = groupMembers.map((member) => {
        const group = groupsById[member.groupID];
        const key = `${member.groupID}____${member.childID || ""}__${activeMonth}`;
        const dbRow = expenseByKey.get(key);

        return {
            id: dbRow?.id || `group-${member.groupID}-${member.childID}`,
            mode: "group",
            childID: member.childID,
            childName: member.children?.name || "طالب",
            groupID: member.groupID,
            privateLessonID: null,
            title: group?.name || group?.subject || "مجموعة",
            amount: Number(dbRow?.amount ?? group?.monthlyFee ?? 0),
            status: dbRow?.status || "unpaid",
            hasRecordedStatus: Boolean(dbRow?.id),
            month: activeMonth,
        };
    });

    const privatePaymentRows = privateLessons.map((lesson) => {
        const key = `__${lesson.id}__${lesson.childID || ""}__${activeMonth}`;
        const dbRow = expenseByKey.get(key);
        const title = `${lesson.subject || "درس خصوصي"}`;

        return {
            id: dbRow?.id || `private-${lesson.id}-${lesson.childID}`,
            mode: "private_lesson",
            childID: lesson.childID,
            childName: lesson.children?.name || "طالب",
            groupID: null,
            privateLessonID: lesson.id,
            title,
            amount: Number(dbRow?.amount ?? lesson.price ?? 0),
            status: dbRow?.status || "unpaid",
            hasRecordedStatus: Boolean(dbRow?.id),
            month: activeMonth,
        };
    });

    const paymentRows = [...groupPaymentRows, ...privatePaymentRows];

    const summary = {
        totalStudents,
        groupStudentsCount,
        privateStudentsCount: uniquePrivateStudentCount,
        groupsCount: groups.length,
        privateLessonsCount: privateLessons.length,
        totalIncome,
        groupIncome,
        privateIncome,
        groupIncomePercent: percentage(groupIncome, totalIncome),
        privateIncomePercent: percentage(privateIncome, totalIncome),
        topGrade: buildSortedDistribution(gradeMap, 1)[0]?.name || "غير متاح",
        topSubject: buildSortedDistribution(subjectMap, 1)[0]?.name || "غير متاح",
        topDay: buildSortedDistribution(dayMap, 1)[0]?.name || "غير متاح",
    };

    const payload = {
        summary,
        studentDistribution: [
            { name: "طلاب المجموعات", value: groupStudentsCount },
            { name: "طلاب الدروس الخصوصية", value: uniquePrivateStudentCount },
        ],
        incomeDistribution: [
            { name: "دخل المجموعات", value: groupIncome },
            { name: "دخل الدروس الخصوصية", value: privateIncome },
        ],
        gradeDistribution: buildSortedDistribution(gradeMap),
        monthlyIncome,
        subjectDistribution: buildSortedDistribution(subjectMap, 8),
        dayDistribution: buildSortedDistribution(dayMap),
        paymentRows,
        activeMonth,
    };

    const { error: snapshotError } = await supabase
        .from("teacher_analytics_snapshots")
        .upsert(
            {
                teacher_id: teacherId,
                summary: payload.summary,
                student_distribution: payload.studentDistribution,
                income_distribution: payload.incomeDistribution,
                grade_distribution: payload.gradeDistribution,
                monthly_income: payload.monthlyIncome,
                subject_distribution: payload.subjectDistribution,
                day_distribution: payload.dayDistribution,
                generated_at: new Date().toISOString(),
            },
            { onConflict: "teacher_id" },
        );

    if (snapshotError) {
        console.warn("⚠️ Failed to persist analytics snapshot:", snapshotError);
    }

    return payload;
}

export async function setTeacherStudentPaymentStatus({
    mode,
    childID,
    groupID = null,
    privateLessonID = null,
    month,
    amount,
    status,
}) {
    const teacherId = await getTeacherIdFromSession();
    const effectiveMonth = month || currentMonthStart();
    const normalizedStatus = status === "paid" ? "paid" : "unpaid";

    if (!childID) throw new Error("childID is required");
    if (mode === "group" && !groupID) throw new Error("groupID is required");
    if (mode === "private_lesson" && !privateLessonID) {
        throw new Error("privateLessonID is required");
    }

    if (mode === "group") {
        const { data: ownGroup, error: ownGroupError } = await supabase
            .from("groups")
            .select("id")
            .eq("id", groupID)
            .eq("teacherID", teacherId)
            .maybeSingle();

        if (ownGroupError) throw ownGroupError;
        if (!ownGroup?.id) throw new Error("Unauthorized group access");
    }

    if (mode === "private_lesson") {
        const { data: ownPrivate, error: ownPrivateError } = await supabase
            .from("private_lessons")
            .select("id")
            .eq("id", privateLessonID)
            .eq("teacherID", teacherId)
            .maybeSingle();

        if (ownPrivateError) throw ownPrivateError;
        if (!ownPrivate?.id) throw new Error("Unauthorized private lesson access");
    }

    let query = supabase
        .from("lesson_expenses")
        .select("id")
        .eq("childID", childID)
        .eq("month", effectiveMonth);

    if (mode === "group") {
        query = query.eq("groupID", groupID).is("privateLessonID", null);
    } else {
        query = query.eq("privateLessonID", privateLessonID).is("groupID", null);
    }

    const { data: existingRow, error: existingError } = await query.maybeSingle();
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

    if (existingRow?.id) {
        const { data, error } = await supabase
            .from("lesson_expenses")
            .update(payload)
            .eq("id", existingRow.id)
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
