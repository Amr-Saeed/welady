import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getChildAttendanceRecords,
    setLessonAttendanceStatus,
} from "../../Services/apiAttendance";

export function useChildAttendanceRecords(childId) {
    return useQuery({
        queryKey: ["childAttendanceRecords", childId],
        queryFn: () => getChildAttendanceRecords(childId),
        enabled: Boolean(childId),
        retry: 1,
    });
}

export function useSaveLessonAttendance(childId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: setLessonAttendanceStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["childAttendanceRecords", childId] });
            queryClient.invalidateQueries({ queryKey: ["headerAttendance", childId] });
        },
    });
}