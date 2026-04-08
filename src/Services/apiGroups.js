import { supabase } from "./supabase";

// ============================================================================
// GROUP MANAGEMENT FUNCTIONS
// ============================================================================

function buildGroupName(group) {
    if (group.name) return group.name;
    if (group.subject && group.grade) return `${group.subject} - ${group.grade}`;
    return group.subject || "مجموعة";
}

function buildScheduleFromGroup(group) {
    const days = Array.isArray(group.lessonDays) ? group.lessonDays : [];
    const times = Array.isArray(group.lessonTimes) ? group.lessonTimes : [];
    const endTimes = Array.isArray(group.lessonTimesEnds) ? group.lessonTimesEnds : [];

    return days.map((day, index) => ({
        id: `${group.id}__${index}`,
        day_of_week: day,
        start_time: times[index] || null,
        end_time: endTimes[index] || null,
    }));
}

function normalizeGroup(group, extras = {}) {
    const membersCount = extras.membersCount ?? group.studentsNumber ?? 0;
    return {
        ...group,
        teacher_id: group.teacherID ?? group.teacher_id ?? null,
        group_code: group.groupCode ?? group.group_code ?? null,
        is_active: group.isActive ?? group.is_active ?? true,
        name: buildGroupName(group),
        type: group.type ?? "group",
        description: group.description ?? group.location ?? "",
        group_members: extras.group_members ?? [],
        group_schedule: extras.group_schedule ?? buildScheduleFromGroup(group),
        group_homework: extras.group_homework ?? [],
        group_attendance: extras.group_attendance ?? [],
        group_members_aggregate: { count: membersCount },
    };
}

function normalizeHomeworkStatus(status) {
    const value = String(status || '').toLowerCase();

    if (value === 'done' || value === 'completed' || value === 'submitted' || value === 'returned') {
        return 'done';
    }

    if (value === 'not_done' || value === 'notdone' || value === 'not done' || value === 'missing') {
        return 'not_done';
    }

    return 'pending';
}

function normalizeLessonDayValue(dayValue) {
    const dayNames = [
        'الأحد',
        'الاثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
        'الجمعة',
        'السبت',
    ];

    if (typeof dayValue === 'number' && dayNames[dayValue]) {
        return dayNames[dayValue];
    }

    if (typeof dayValue === 'string') {
        const trimmed = dayValue.trim();
        const dayIndex = Number.parseInt(trimmed, 10);
        if (!Number.isNaN(dayIndex) && String(dayIndex) === trimmed && dayNames[dayIndex]) {
            return dayNames[dayIndex];
        }
        return trimmed;
    }

    return dayValue;
}

function normalizeDayForComparison(dayValue) {
    const normalized = normalizeLessonDayValue(dayValue);
    if (typeof normalized !== 'string') return '';

    const value = normalized.trim();
    const lower = value.toLowerCase();

    const englishToArabic = {
        sunday: 'الأحد',
        monday: 'الاثنين',
        tuesday: 'الثلاثاء',
        wednesday: 'الأربعاء',
        thursday: 'الخميس',
        friday: 'الجمعة',
        saturday: 'السبت',
    };

    return englishToArabic[lower] || value;
}

function toMinutes(timeValue) {
    if (typeof timeValue !== 'string' || !timeValue.includes(':')) return null;
    const [hoursRaw, minutesRaw] = timeValue.split(':');
    const hours = Number.parseInt(hoursRaw, 10);
    const minutes = Number.parseInt(minutesRaw, 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
}

function intervalsOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

async function assertNoTeacherScheduleConflicts(teacherId, newSchedules = []) {
    const normalizedNewSchedules = (newSchedules || []).map((slot) => ({
        day: normalizeDayForComparison(slot?.day),
        startTime: slot?.startTime || null,
        endTime: slot?.endTime || null,
        startMinutes: toMinutes(slot?.startTime),
        endMinutes: toMinutes(slot?.endTime),
    })).filter((slot) => slot.day && slot.startMinutes !== null && slot.endMinutes !== null && slot.endMinutes > slot.startMinutes);

    if (normalizedNewSchedules.length === 0) return;

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

    const existingGroupSchedules = (teacherGroups || []).flatMap((group) => {
        const days = Array.isArray(group.lessonDays) ? group.lessonDays : [];
        const starts = Array.isArray(group.lessonTimes) ? group.lessonTimes : [];
        const ends = Array.isArray(group.lessonTimesEnds) ? group.lessonTimesEnds : [];

        return days.map((day, index) => {
            const startTime = starts[index] || null;
            const endTime = ends[index] || null;
            return {
                day: normalizeDayForComparison(day),
                startTime,
                endTime,
                startMinutes: toMinutes(startTime),
                endMinutes: toMinutes(endTime),
            };
        }).filter((slot) => slot.day && slot.startMinutes !== null && slot.endMinutes !== null && slot.endMinutes > slot.startMinutes);
    });

    const existingPrivateSchedules = (privateLessons || []).flatMap((lesson) => {
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

    for (const newSlot of normalizedNewSchedules) {
        for (const existingGroupSlot of existingGroupSchedules) {
            if (newSlot.day !== existingGroupSlot.day) continue;

            if (
                intervalsOverlap(
                    newSlot.startMinutes,
                    newSlot.endMinutes,
                    existingGroupSlot.startMinutes,
                    existingGroupSlot.endMinutes,
                )
            ) {
                throw new Error(`يوجد تعارض في الميعاد يوم ${newSlot.day} من ${newSlot.startTime} إلى ${newSlot.endTime}`);
            }
        }

        for (const existingPrivateSlot of existingPrivateSchedules) {
            if (newSlot.day !== existingPrivateSlot.day) continue;

            if (
                existingPrivateSlot.minutes >= newSlot.startMinutes &&
                existingPrivateSlot.minutes < newSlot.endMinutes
            ) {
                throw new Error(`يوجد تعارض مع درس خصوصي يوم ${newSlot.day} الساعة ${existingPrivateSlot.time}`);
            }
        }
    }
}

/**
 * Create a new group
 */
export async function createGroup(name, subject, type, description = "", schedule = {}) {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("Not authenticated");

        const teacher_id = session.user.id;

        const lessonDays = Array.isArray(schedule.lessonDays) ? schedule.lessonDays : [];
        const lessonTimes = Array.isArray(schedule.lessonTimes) ? schedule.lessonTimes : [];
        const lessonTimesEnds = Array.isArray(schedule.lessonTimesEnds) ? schedule.lessonTimesEnds : [];
        const monthlyFee = Number(schedule.monthlyFee || 0);

        const newSchedules = lessonDays.map((day, index) => ({
            day,
            startTime: lessonTimes[index] || null,
            endTime: lessonTimesEnds[index] || null,
        }));

        await assertNoTeacherScheduleConflicts(teacher_id, newSchedules);

        // Generate unique group code
        const groupCode = `GRP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const { data, error } = await supabase
            .from('groups')
            .insert({
                teacherID: teacher_id,
                subject,
                grade: name,
                lessonDays,
                lessonTimes,
                lessonTimesEnds,
                location: schedule.location || description,
                groupCode: groupCode,
                isActive: true,
                monthlyFee,
                studentsNumber: 0,
            })
            .select()
            .single();

        if (error) throw error;

        console.log("✅ Group created:", data);
        return data;
    } catch (error) {
        console.error("❌ Error creating group:", error);
        const message =
            error?.message ||
            error?.details ||
            error?.error_description ||
            "تعذر إنشاء المجموعة";
        throw new Error(message);
    }
}

/**
 * Get all groups for the current teacher
 */
export async function getTeacherGroups() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("Not authenticated");

        const teacher_id = session.user.id;

        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('teacherID', teacher_id)
            .eq('isActive', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const groupIds = (data || []).map((group) => group.id);
        const membersCountByGroupId = {};

        if (groupIds.length > 0) {
            const { data: membersRows, error: membersError } = await supabase
                .from('group_members')
                .select('groupID')
                .in('groupID', groupIds);

            if (membersError) throw membersError;

            for (const row of membersRows || []) {
                const groupId = row.groupID;
                membersCountByGroupId[groupId] = (membersCountByGroupId[groupId] || 0) + 1;
            }
        }

        const normalized = (data || []).map((group) =>
            normalizeGroup(group, {
                membersCount: membersCountByGroupId[group.id] || 0,
            }),
        );

        console.log("✅ Teacher groups fetched:", normalized);
        return normalized;
    } catch (error) {
        console.error("❌ Error fetching groups:", error);
        throw error;
    }
}

/**
 * Get a specific group by ID
 */
export async function getGroupById(groupId) {
    try {
        const { data: groupData, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (error) throw error;

        const membersData = await getGroupMembers(groupId);

        const { data: homeworkData, error: homeworkError } = await supabase
            .from('homework')
            .select('*')
            .eq('groupID', groupId)
            .order('created_at', { ascending: false });

        if (homeworkError) throw homeworkError;

        const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .eq('groupID', groupId)
            .order('lessonDate', { ascending: false });

        if (attendanceError) throw attendanceError;

        const normalized = normalizeGroup(groupData, {
            group_members: membersData || [],
            group_homework: homeworkData || [],
            group_attendance: attendanceData || [],
            membersCount: membersData?.length || groupData.studentsNumber || 0,
        });

        console.log("✅ Group fetched:", normalized);
        return normalized;
    } catch (error) {
        console.error("❌ Error fetching group:", error);
        throw error;
    }
}

/**
 * Get group by group code (for joining)
 */
export async function getGroupByCode(groupCode) {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('groupCode', groupCode)
            .eq('isActive', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new Error("كود المجموعة غير صحيح");
            }
            throw error;
        }

        const normalized = normalizeGroup(data);

        console.log("✅ Group found by code:", normalized);
        return normalized;
    } catch (error) {
        console.error("❌ Error fetching group by code:", error);
        throw error;
    }
}

/**
 * Update group details
 */
export async function updateGroup(groupId, updates) {
    try {
        const mappedUpdates = { ...updates };

        if (Object.prototype.hasOwnProperty.call(mappedUpdates, 'teacher_id')) {
            mappedUpdates.teacherID = mappedUpdates.teacher_id;
            delete mappedUpdates.teacher_id;
        }
        if (Object.prototype.hasOwnProperty.call(mappedUpdates, 'group_code')) {
            mappedUpdates.groupCode = mappedUpdates.group_code;
            delete mappedUpdates.group_code;
        }
        if (Object.prototype.hasOwnProperty.call(mappedUpdates, 'is_active')) {
            mappedUpdates.isActive = mappedUpdates.is_active;
            delete mappedUpdates.is_active;
        }

        const { data, error } = await supabase
            .from('groups')
            .update(mappedUpdates)
            .eq('id', groupId)
            .select()
            .single();

        if (error) throw error;

        console.log("✅ Group updated:", data);
        return data;
    } catch (error) {
        console.error("❌ Error updating group:", error);
        throw error;
    }
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId) {
    try {
        const { error: attendanceError } = await supabase
            .from('attendance')
            .delete()
            .eq('groupID', groupId);

        if (attendanceError) throw attendanceError;

        const { error: homeworkError } = await supabase
            .from('homework')
            .delete()
            .eq('groupID', groupId);

        if (homeworkError) throw homeworkError;

        const { error: membersError } = await supabase
            .from('group_members')
            .delete()
            .eq('groupID', groupId);

        if (membersError) throw membersError;

        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);

        if (error) throw error;

        console.log("✅ Group deleted");
        return true;
    } catch (error) {
        console.error("❌ Error deleting group:", error);
        throw error;
    }
}

// ============================================================================
// GROUP MEMBERS MANAGEMENT
// ============================================================================

/**
 * Add a child to a group
 */
export async function addMemberToGroup(groupId, childId, _PARENT_ID) {
    try {
        void _PARENT_ID;

        const { data: existingMember, error: existingError } = await supabase
            .from('group_members')
            .select('id')
            .eq('groupID', groupId)
            .eq('childID', childId)
            .eq('isActive', true)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existingMember?.id) {
            throw new Error('هذا الطالب مضاف بالفعل في المجموعة');
        }

        const { data, error } = await supabase
            .from('group_members')
            .insert({
                groupID: groupId,
                childID: childId,
                isActive: true,
            })
            .select()
            .single();

        if (error) throw error;

        console.log("✅ Member added to group:", data);
        return data;
    } catch (error) {
        console.error("❌ Error adding member:", error);
        throw error;
    }
}

/**
 * Remove a child from a group
 */
export async function removeMemberFromGroup(groupId, childId) {
    try {
        const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('groupID', groupId)
            .eq('childID', childId);

        if (error) throw error;

        console.log("✅ Member removed from group");
        return true;
    } catch (error) {
        console.error("❌ Error removing member:", error);
        throw error;
    }
}

/**
 * Get group members
 */
export async function getGroupMembers(groupId) {
    try {
        const { data: membersData, error } = await supabase
            .from('group_members')
            .select(`
                *,
                children(id, name, grade, studentCode, parentID)
            `)
            .eq('groupID', groupId);

        if (error) throw error;

        // Extract unique parent IDs from the children
        const parentIds = [...new Set(
            (membersData || [])
                .map((member) => member.children?.parentID)
                .filter(Boolean)
        )];

        // Fetch user data (which includes phone numbers) for all parents using RPC
        let usersByParentId = {};
        if (parentIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .rpc('get_parent_info', { p_parent_ids: parentIds });

            if (usersError) {
                console.warn("⚠️  Warning: Could not fetch users data, continuing without phone numbers:", usersError);
            } else {
                // Map users by their ID (which is the parentID)
                usersByParentId = (usersData || []).reduce((accumulator, user) => {
                    accumulator[user.id] = {
                        phoneNumber: user.phoneNumber,
                        name: user.name,
                    };
                    return accumulator;
                }, {});
            }
        }

        // Normalize and enrich member data with parent information
        const normalized = (membersData || []).map((member) => {
            const parentId = member.children?.parentID;
            const parentInfo = usersByParentId[parentId] || {};

            return {
                ...member,
                group_id: member.groupID ?? member.group_id,
                child_id: member.childID ?? member.child_id,
                parent_id: parentId,
                parents: {
                    id: parentId,
                    phoneNumber: parentInfo.phoneNumber || null,
                    name: parentInfo.name || null,
                },
            };
        });

        console.log("✅ Group members fetched:", normalized);
        return normalized;
    } catch (error) {
        console.error("❌ Error fetching members:", error);
        throw error;
    }
}

// ============================================================================
// GROUP SCHEDULE MANAGEMENT
// ============================================================================

/**
 * Add a lesson schedule to a group
 */
export async function addGroupSchedule(groupId, dayOfWeek, startTime, endTime) {
    try {
        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('lessonDays, lessonTimes, lessonTimesEnds')
            .eq('id', groupId)
            .single();

        if (groupError) throw groupError;

        const lessonDays = Array.isArray(groupData.lessonDays) ? [...groupData.lessonDays] : [];
        const lessonTimes = Array.isArray(groupData.lessonTimes) ? [...groupData.lessonTimes] : [];
        const lessonTimesEnds = Array.isArray(groupData.lessonTimesEnds) ? [...groupData.lessonTimesEnds] : [];

        lessonDays.push(normalizeLessonDayValue(dayOfWeek));
        lessonTimes.push(startTime);
        lessonTimesEnds.push(endTime);

        const { data, error } = await supabase
            .from('groups')
            .update({
                lessonDays,
                lessonTimes,
                lessonTimesEnds,
            })
            .eq('id', groupId)
            .select('*')
            .single();

        if (error) throw error;

        const normalized = normalizeGroup(data);

        console.log("✅ Schedule added:", normalized);
        return normalized;
    } catch (error) {
        console.error("❌ Error adding schedule:", error);
        throw error;
    }
}

/**
 * Update an existing lesson schedule entry
 */
export async function updateGroupSchedule(scheduleId, dayOfWeek, startTime, endTime) {
    try {
        const separatorIndex = scheduleId.lastIndexOf('__');
        if (separatorIndex === -1) {
            throw new Error('Invalid schedule id');
        }

        const groupId = scheduleId.slice(0, separatorIndex);
        const scheduleIndex = Number(scheduleId.slice(separatorIndex + 2));

        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('lessonDays, lessonTimes, lessonTimesEnds')
            .eq('id', groupId)
            .single();

        if (groupError) throw groupError;

        const lessonDays = Array.isArray(groupData.lessonDays) ? [...groupData.lessonDays] : [];
        const lessonTimes = Array.isArray(groupData.lessonTimes) ? [...groupData.lessonTimes] : [];
        const lessonTimesEnds = Array.isArray(groupData.lessonTimesEnds) ? [...groupData.lessonTimesEnds] : [];

        if (scheduleIndex < 0 || scheduleIndex >= lessonDays.length) {
            throw new Error('Schedule entry not found');
        }

        lessonDays[scheduleIndex] = normalizeLessonDayValue(dayOfWeek);
        lessonTimes[scheduleIndex] = startTime;
        lessonTimesEnds[scheduleIndex] = endTime;

        const { data, error } = await supabase
            .from('groups')
            .update({
                lessonDays,
                lessonTimes,
                lessonTimesEnds,
            })
            .eq('id', groupId)
            .select('*')
            .single();

        if (error) throw error;

        const normalized = normalizeGroup(data);

        console.log("✅ Schedule updated:", normalized);
        return normalized;
    } catch (error) {
        console.error("❌ Error updating schedule:", error);
        throw error;
    }
}

/**
 * Get group schedules
 */
export async function getGroupSchedule(groupId) {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('lessonDays, lessonTimes, lessonTimesEnds')
            .eq('id', groupId)
            .single();

        if (error) throw error;

        const schedule = buildScheduleFromGroup({
            id: groupId,
            lessonDays: data.lessonDays,
            lessonTimes: data.lessonTimes,
            lessonTimesEnds: data.lessonTimesEnds,
        });

        console.log("✅ Group schedule fetched:", schedule);
        return schedule;
    } catch (error) {
        console.error("❌ Error fetching schedule:", error);
        throw error;
    }
}

/**
 * Delete a schedule entry
 */
export async function deleteScheduleEntry(scheduleId) {
    try {
        const separatorIndex = scheduleId.lastIndexOf('__');
        if (separatorIndex === -1) {
            throw new Error('Invalid schedule id');
        }

        const groupId = scheduleId.slice(0, separatorIndex);
        const scheduleIndex = Number(scheduleId.slice(separatorIndex + 2));

        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('lessonDays, lessonTimes, lessonTimesEnds')
            .eq('id', groupId)
            .single();

        if (groupError) throw groupError;

        const lessonDays = Array.isArray(groupData.lessonDays) ? [...groupData.lessonDays] : [];
        const lessonTimes = Array.isArray(groupData.lessonTimes) ? [...groupData.lessonTimes] : [];
        const lessonTimesEnds = Array.isArray(groupData.lessonTimesEnds) ? [...groupData.lessonTimesEnds] : [];

        lessonDays.splice(scheduleIndex, 1);
        lessonTimes.splice(scheduleIndex, 1);
        lessonTimesEnds.splice(scheduleIndex, 1);

        const { error } = await supabase
            .from('groups')
            .update({ lessonDays, lessonTimes, lessonTimesEnds })
            .eq('id', groupId);

        if (error) throw error;

        console.log("✅ Schedule entry deleted");
        return true;
    } catch (error) {
        console.error("❌ Error deleting schedule:", error);
        throw error;
    }
}

// ============================================================================
// HOMEWORK MANAGEMENT
// ============================================================================

/**
 * Add homework to a group or specific child
 */
export async function addHomework(groupId, title, description, dueDate, childId = null) {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from('homework')
            .insert({
                groupID: groupId,
                childID: childId,
                title,
                description,
                dueDate: dueDate,
                privateLessonID: null,
            })
            .select()
            .single();

        if (error) throw error;

        console.log("✅ Homework added:", data);
        return data;
    } catch (error) {
        console.error("❌ Error adding homework:", error);
        throw error;
    }
}

/**
 * Update homework details
 */
export async function updateHomework(homeworkId, updates) {
    try {
        const mappedUpdates = { ...updates };

        if (Object.prototype.hasOwnProperty.call(mappedUpdates, 'due_date')) {
            mappedUpdates.dueDate = mappedUpdates.due_date;
            delete mappedUpdates.due_date;
        }

        if (Object.prototype.hasOwnProperty.call(mappedUpdates, 'child_id')) {
            mappedUpdates.childID = mappedUpdates.child_id;
            delete mappedUpdates.child_id;
        }

        const { data, error } = await supabase
            .from('homework')
            .update(mappedUpdates)
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
 * Get homework for a group
 */
export async function getGroupHomework(groupId) {
    try {
        const { data, error } = await supabase
            .from('homework')
            .select('*')
            .eq('groupID', groupId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log("✅ Group homework fetched:", data);
        return data;
    } catch (error) {
        console.error("❌ Error fetching homework:", error);
        throw error;
    }
}

/**
 * Get all status rows for a specific homework
 */
export async function getHomeworkStatuses(homeworkId) {
    try {
        const { data, error } = await supabase
            .from('homework_submissions')
            .select('*')
            .eq('homeworkid', homeworkId);

        if (error) throw error;

        return (data || []).map((row) => ({
            ...row,
            homeworkID: row.homeworkid,
            childID: row.childid,
            status: normalizeHomeworkStatus(row.status),
        }));
    } catch (error) {
        console.error("❌ Error fetching homework statuses:", error);
        throw error;
    }
}

/**
 * Upsert a student's status for a homework
 */
export async function setHomeworkStatus(homeworkId, childId, status) {
    try {
        const normalizedStatus = normalizeHomeworkStatus(status);
        const nowIso = new Date().toISOString();

        const { data: existingRow, error: existingError } = await supabase
            .from('homework_submissions')
            .select('id')
            .eq('homeworkid', homeworkId)
            .eq('childid', childId)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existingRow?.id) {
            const { data, error } = await supabase
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
            return data;
        }

        const { data, error } = await supabase
            .from('homework_submissions')
            .insert({
                homeworkid: homeworkId,
                childid: childId,
                status: normalizedStatus,
                submitted_at: normalizedStatus === 'done' ? nowIso : null,
                updated_at: nowIso,
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("❌ Error setting homework status:", error);
        throw error;
    }
}

/**
 * Build homework analytics for one child inside one group
 */
export async function getChildHomeworkAnalytics(groupId, childId) {
    try {
        const { data: homeworkRows, error: homeworkError } = await supabase
            .from('homework')
            .select('id, title, description, dueDate, created_at, childID')
            .eq('groupID', groupId)
            .or(`childID.is.null,childID.eq.${childId}`)
            .order('created_at', { ascending: false });

        if (homeworkError) throw homeworkError;

        const homeworkIds = (homeworkRows || []).map((row) => row.id);
        let statusByHomeworkId = {};

        if (homeworkIds.length > 0) {
            const { data: statusRows, error: statusError } = await supabase
                .from('homework_submissions')
                .select('homeworkid, childid, status, updated_at, submitted_at')
                .eq('childid', childId)
                .in('homeworkid', homeworkIds);

            if (statusError) throw statusError;

            statusByHomeworkId = (statusRows || []).reduce((accumulator, row) => {
                accumulator[row.homeworkid] = row;
                return accumulator;
            }, {});
        }

        const normalizedItems = (homeworkRows || []).map((row) => {
            const statusRow = statusByHomeworkId[row.id];
            const normalizedStatus = normalizeHomeworkStatus(statusRow?.status);
            return {
                id: row.id,
                title: row.title,
                description: row.description,
                due_date: row.dueDate || null,
                created_at: row.created_at,
                is_individual: Boolean(row.childID),
                status: normalizedStatus,
                updated_at: statusRow?.updated_at || null,
                submitted_at: statusRow?.submitted_at || null,
            };
        });

        const summary = {
            total: normalizedItems.length,
            done: normalizedItems.filter((item) => item.status === 'done').length,
            not_done: normalizedItems.filter((item) => item.status === 'not_done').length,
            pending: normalizedItems.filter((item) => item.status === 'pending').length,
        };

        return { summary, items: normalizedItems };
    } catch (error) {
        console.error("❌ Error getting child homework analytics:", error);
        throw error;
    }
}

/**
 * Build attendance analytics for one child inside one group
 */
export async function getChildAttendanceAnalytics(groupId, childId) {
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('id, status, lessonDate, notes, created_at')
            .eq('groupID', groupId)
            .eq('childID', childId)
            .order('lessonDate', { ascending: false });

        if (error) throw error;

        const rows = data || [];
        const summary = {
            total: rows.length,
            attending: rows.filter((row) => row.status === 'attending').length,
            absent: rows.filter((row) => row.status === 'absent').length,
            late: rows.filter((row) => row.status === 'late').length,
            canceled: rows.filter((row) => row.status === 'canceled').length,
        };

        return { summary, items: rows };
    } catch (error) {
        console.error("❌ Error getting child attendance analytics:", error);
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

// ============================================================================
// ATTENDANCE MANAGEMENT
// ============================================================================

/**
 * Record attendance for a group lesson session
 */
export async function recordAttendance(
    groupId,
    childId,
    lessonDate,
    status,
    notes = "",
    markedByRole = 'teacher'
) {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("Not authenticated");

        const { data: existingRow, error: existingError } = await supabase
            .from('attendance')
            .select('id')
            .eq('groupID', groupId)
            .eq('childID', childId)
            .eq('lessonDate', lessonDate)
            .maybeSingle();

        if (existingError) throw existingError;

        let data;
        if (existingRow?.id) {
            const { data: updatedData, error: updateError } = await supabase
                .from('attendance')
                .update({
                    status,
                    notes,
                    markedByRole: markedByRole || 'teacher',
                })
                .eq('id', existingRow.id)
                .select()
                .single();

            if (updateError) throw updateError;
            data = updatedData;
        } else {
            const { data: insertedData, error: insertError } = await supabase
                .from('attendance')
                .insert({
                    groupID: groupId,
                    childID: childId,
                    lessonDate,
                    status,
                    notes,
                    markedByRole: markedByRole || 'teacher',
                })
                .select()
                .single();

            if (insertError) throw insertError;
            data = insertedData;
        }

        console.log("✅ Attendance recorded:", data);
        return data;
    } catch (error) {
        console.error("❌ Error recording attendance:", error);
        throw error;
    }
}

/**
 * Parent updates attendance status from notification action
 */
export async function recordAttendanceByParent(groupId, childId, lessonDate, status, notes = "") {
    return recordAttendance(groupId, childId, lessonDate, status, notes, 'parent');
}

/**
 * Get attendance for a group and date
 */
export async function getGroupAttendanceByDate(groupId, lessonDate) {
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                *,
                children(id, name)
            `)
            .eq('groupID', groupId)
            .eq('lessonDate', lessonDate);

        if (error) throw error;

        console.log("✅ Attendance records fetched:", data);
        return data;
    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        throw error;
    }
}

/**
 * Get all attendance records for a group
 */
export async function getGroupAttendanceHistory(groupId) {
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                *,
                children(id, name)
            `)
            .eq('groupID', groupId)
            .order('lessonDate', { ascending: false });

        if (error) throw error;

        console.log("✅ Attendance history fetched:", data);
        return data;
    } catch (error) {
        console.error("❌ Error fetching attendance history:", error);
        throw error;
    }
}

/**
 * Get attendance summary for a group
 */
export async function getGroupAttendanceSummary(groupId) {
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('status')
            .eq('groupID', groupId);

        if (error) throw error;

        const summary = {
            total: data.length,
            attending: data.filter(r => r.status === 'attending').length,
            absent: data.filter(r => r.status === 'absent').length,
            late: data.filter(r => r.status === 'late').length,
            canceled: data.filter(r => r.status === 'canceled').length,
        };

        console.log("✅ Attendance summary:", summary);
        return summary;
    } catch (error) {
        console.error("❌ Error getting attendance summary:", error);
        throw error;
    }
}
