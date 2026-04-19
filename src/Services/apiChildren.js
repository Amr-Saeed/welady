import { supabase } from "./supabase";

const ARABIC_DAY_TO_INDEX = {
    الأحد: 0,
    الاثنين: 1,
    الثلاثاء: 2,
    الأربعاء: 3,
    الخميس: 4,
    الجمعة: 5,
    السبت: 6,
};

function toDateWithTime(dateStr, timeStr) {
    if (!dateStr) return null;
    const safeTime = timeStr || '23:59:00';
    const date = new Date(`${dateStr}T${safeTime}`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDayName(dayValue) {
    if (typeof dayValue !== 'string') return '';
    const value = dayValue.trim();
    if (!value) return '';

    const lower = value.toLowerCase();
    const map = {
        sunday: 'الأحد',
        monday: 'الاثنين',
        tuesday: 'الثلاثاء',
        wednesday: 'الأربعاء',
        thursday: 'الخميس',
        friday: 'الجمعة',
        saturday: 'السبت',
    };

    return map[lower] || value;
}

function normalizeDayList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
}

function normalizeTimeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
}

function nextOccurrenceDate(dayName, timeStr) {
    const normalizedDay = normalizeDayName(dayName);
    const dayIndex = ARABIC_DAY_TO_INDEX[normalizedDay];
    if (dayIndex === undefined) return null;

    const now = new Date();
    const candidate = new Date(now);

    const currentDay = now.getDay();
    let diff = dayIndex - currentDay;
    if (diff < 0) diff += 7;

    candidate.setDate(now.getDate() + diff);

    const [hoursRaw = '23', minutesRaw = '59'] = String(timeStr || '23:59').split(':');
    candidate.setHours(Number.parseInt(hoursRaw, 10) || 0, Number.parseInt(minutesRaw, 10) || 0, 0, 0);

    if (candidate < now) {
        candidate.setDate(candidate.getDate() + 7);
    }

    return candidate;
}

function pickNearestUpcoming(candidates = []) {
    const now = new Date();
    return candidates
        .filter((item) => item?.date instanceof Date && item.date >= now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null;
}

async function buildUpcomingLessonCandidates(childId) {
    if (!childId) return [];

    const [manualRes, privateRes, membershipRes] = await Promise.all([
        supabase
            .from('manual_lessons')
            .select('id, subject, lessonDay, lessonTime, location, date, teacherName')
            .eq('childID', childId),
        supabase
            .from('private_lessons')
            .select('id, subject, lessonDay, lessonTime, location, isActive')
            .eq('childID', childId)
            .eq('isActive', true),
        supabase
            .from('group_members')
            .select('groupID')
            .eq('childID', childId),
    ]);

    if (manualRes.error) throw manualRes.error;
    if (privateRes.error) throw privateRes.error;

    let groupIds = [];
    if (!membershipRes.error) {
        groupIds = (membershipRes.data || [])
            .map((row) => row.groupID)
            .filter(Boolean);
    }

    if (membershipRes.error) {
        console.warn('⚠️ Failed to fetch group memberships for upcoming lessons:', membershipRes.error);
    }

    // Fallback when group_members rows are missing/inconsistent for some children.
    if (groupIds.length === 0) {
        const groupsSnapshotRes = await supabase
            .from('groups')
            .select('id')
            .contains('childIDs', [childId]);

        if (!groupsSnapshotRes.error) {
            groupIds = (groupsSnapshotRes.data || []).map((row) => row.id).filter(Boolean);
        }
    }

    // Extra fallback: derive group IDs from group homework RPC (often allowed even when
    // direct group_members visibility is restricted by RLS).
    if (groupIds.length === 0) {
        try {
            const { data: homeworkRows, error: homeworkRpcError } = await supabase.rpc(
                'get_parent_group_homeworks',
                { p_child_id: childId },
            );

            if (!homeworkRpcError && Array.isArray(homeworkRows)) {
                groupIds = [...new Set(
                    homeworkRows
                        .map((row) => row?.groupID || row?.group_id)
                        .filter(Boolean),
                )];
            }
        } catch {
            // no-op
        }
    }

    let groups = [];
    if (groupIds.length > 0) {
        let groupsRes = await supabase
            .from('groups')
            .select('id, subject, grade, teacherName, lessonDays, lessonTimes, location, isActive')
            .in('id', groupIds);

        // Fallback for schema variants where filtering/columns differ.
        if (groupsRes.error) {
            groupsRes = await supabase
                .from('groups')
                .select('id, subject, grade, lessonDays, lessonTimes, location');

            if (!groupsRes.error) {
                groupsRes.data = (groupsRes.data || []).filter((row) => groupIds.includes(row.id));
            }
        }

        if (groupsRes.error) throw groupsRes.error;
        groups = (groupsRes.data || []).filter((group) => group?.isActive !== false);
    }

    const candidates = [];

    (manualRes.data || []).forEach((lesson) => {
        let date = toDateWithTime(lesson.date, lesson.lessonTime);

        if (!date) {
            const day = Array.isArray(lesson.lessonDay) ? lesson.lessonDay[0] : lesson.lessonDay;
            date = nextOccurrenceDate(day, lesson.lessonTime);
        }

        if (!date) return;

        candidates.push({
            source: 'manual',
            date,
            subject: lesson.subject || 'درس',
            time: lesson.lessonTime || null,
            location: lesson.location || 'غير محدد',
            day: Array.isArray(lesson.lessonDay) ? lesson.lessonDay[0] : lesson.lessonDay,
            typeLabel: 'يدوي',
        });
    });

    (privateRes.data || []).forEach((lesson) => {
        const days = normalizeDayList(lesson.lessonDay || lesson.lessonDays);

        days.forEach((day) => {
            const date = nextOccurrenceDate(day, lesson.lessonTime);
            if (!date) return;

            candidates.push({
                source: 'private',
                date,
                subject: lesson.subject || 'درس خصوصي',
                time: lesson.lessonTime || null,
                location: lesson.location || 'غير محدد',
                day,
                typeLabel: 'خصوصي',
            });
        });
    });

    groups.forEach((group) => {
        const days = normalizeDayList(group.lessonDays);
        const times = normalizeTimeList(group.lessonTimes);
        const maxLen = Math.max(days.length, times.length, 1);

        Array.from({ length: maxLen }).forEach((_, index) => {
            const day = days[index] || days[0] || null;
            const time = times[index] || times[0] || null;
            const date = nextOccurrenceDate(day, time);
            if (!date) return;

            candidates.push({
                source: 'group',
                groupID: group.id,
                date,
                subject: group.subject || 'مجموعة',
                time,
                location: group.location || 'غير محدد',
                teacherName: group.teacherName || null,
                day,
                typeLabel: 'مجموعة',
                groupGrade: group.grade || null,
            });
        });
    });

    return candidates;
}

export async function getUpcomingLessonsForChild(childId) {
    try {
        const candidates = await buildUpcomingLessonCandidates(childId);

        return candidates
            .filter((item) => item?.date instanceof Date && item.date >= new Date())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map((item) => ({
                ...item,
                timestamp: item.date.toISOString(),
            }));
    } catch (error) {
        console.error('Error getting upcoming lessons:', error);
        throw error;
    }
}

// Generate random student code like WL-A3K5L9
function generateStudentCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    // Generate 6 random characters (mix of letters and numbers)
    let code = '';
    for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) {
            // Even positions: letters
            code += letters.charAt(Math.floor(Math.random() * letters.length));
        } else {
            // Odd positions: numbers
            code += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
    }

    return `WL-${code}`;
}

// Check if student code already exists
async function isCodeUnique(code) {
    const { data } = await supabase
        .from('children')
        .select('studentCode')
        .eq('studentCode', code)
        .single();

    // If no data found, code is unique
    return !data;
}

// Generate a unique student code
async function generateUniqueStudentCode() {
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
        code = generateStudentCode();
        isUnique = await isCodeUnique(code);
        attempts++;
    }

    if (!isUnique) {
        throw new Error("Failed to generate unique student code after multiple attempts");
    }

    return code;
}

// Add a new child
export async function addChild({ parentId, name, grade, age = null }) {
    try {
        console.log("👶 Adding child:", { parentId, name, grade, age });

        // Generate unique student code
        const studentCode = await generateUniqueStudentCode();
        console.log("🎟️ Generated student code:", studentCode);

        // Insert child into database
        const { error } = await supabase
            .from('children')
            .insert({
                parentID: parentId,
                name,
                grade,
                age,
                studentCode,
            });

        if (error) throw error;

        // Return the child data manually since .select() causes recursion
        const childData = {
            parentID: parentId,
            name,
            grade,
            age,
            studentCode,
        };

        console.log("✅ Child added successfully:", childData);
        return childData;
    } catch (error) {
        console.error("❌ Error adding child:", error);
        throw error;
    }
}

// Get all children for a parent
export async function getChildrenByParent(parentId) {
    try {
        const { data, error } = await supabase
            .from('children')
            .select('*')
            .eq('parentID', parentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("❌ Error fetching children:", error);
        throw error;
    }
}

// Get a single child by ID
export async function getChildById(childId) {
    try {
        const { data, error } = await supabase
            .from('children')
            .select('*')
            .eq('id', childId)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("❌ Error fetching child:", error);
        throw error;
    }
}

// Get child by student code
export async function getChildByCode(studentCode) {
    try {
        const { data, error } = await supabase
            .from('children')
            .select('*')
            .eq('studentCode', studentCode)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("❌ Error fetching child by code:", error);
        throw error;
    }
}

// Get nearest upcoming lesson across manual/private/group lessons for one child
export async function getNearestUpcomingLessonForChild(childId) {
    try {
        const candidates = await buildUpcomingLessonCandidates(childId);
        const nearest = pickNearestUpcoming(candidates);
        if (!nearest) return null;

        return {
            ...nearest,
            timestamp: nearest.date.toISOString(),
        };
    } catch (error) {
        console.error('Error getting nearest upcoming lesson:', error);
        throw error;
    }
}
