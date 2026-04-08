export function formatToArabic12Hour(timeValue) {
    if (!timeValue) return "";

    const normalized = String(timeValue).trim();
    const [hoursPart, minutesPart = "00"] = normalized.split(":");
    const hours = Number.parseInt(hoursPart, 10);
    const minutes = Number.parseInt(minutesPart, 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return normalized;
    }

    const period = hours >= 12 ? "م" : "ص";
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    const minutesText = `:${String(minutes).padStart(2, "0")}`;
    return `${hours12}${minutesText} ${period}`;
}

export function formatArabicTimeRange(startTime, endTime) {
    const startLabel = formatToArabic12Hour(startTime);
    const endLabel = formatToArabic12Hour(endTime);

    if (startLabel && endLabel) return `${startLabel} إلى ${endLabel}`;
    return startLabel || endLabel || "";
}

export function formatArabicDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes(),
    ).padStart(2, "0")}`;

    return `${dd}-${mm}-${yyyy} ${formatToArabic12Hour(hhmm)}`;
}
