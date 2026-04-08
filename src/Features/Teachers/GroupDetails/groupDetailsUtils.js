import { formatArabicTimeRange, formatToArabic12Hour } from "../../../Utils/helper";

export const DAY_NAMES = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
];

export function formatDayName(dayValue) {
    if (typeof dayValue === "number" && DAY_NAMES[dayValue]) {
        return DAY_NAMES[dayValue];
    }

    if (typeof dayValue === "string") {
        const trimmed = dayValue.trim();
        const dayIndex = Number.parseInt(trimmed, 10);
        if (!Number.isNaN(dayIndex) && String(dayIndex) === trimmed && DAY_NAMES[dayIndex]) {
            return DAY_NAMES[dayIndex];
        }
    }

    return dayValue || "غير محدد";
}

export function formatScheduleTime(timeValue) {
    return formatToArabic12Hour(timeValue);
}

export function formatScheduleRange(startTime, endTime) {
    return formatArabicTimeRange(startTime, endTime);
}