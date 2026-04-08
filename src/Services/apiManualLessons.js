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

    const teacherIds = [...new Set((privateRows || []).map((row) => row.teacherID).filter(Boolean))];
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

    const normalizedPrivateRows = (privateRows || []).map((row) => {
        const lessonDayArray = Array.isArray(row.lessonDay) ? row.lessonDay : [];
        const firstDay = lessonDayArray[0] || null;

        return {
            id: row.id,
            childID: row.childID,
            subject: row.subject,
            lessonDay: lessonDayArray,
            lessonTime: row.lessonTime,
            location: row.location,
            teacherName: teachersById[row.teacherID] || "المدرس",
            date: nextDateForDayName(firstDay),
            price: row.price,
            source: "private",
        };
    });

    return [...(manualRows || []), ...normalizedPrivateRows].sort((a, b) => {
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
