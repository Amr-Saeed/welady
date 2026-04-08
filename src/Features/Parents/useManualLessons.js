import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addManualLesson,
    getManualLessonsByChildId,
} from "../../Services/apiManualLessons";

export function useManualLessonsByChild(childId) {
    return useQuery({
        queryKey: ["manualLessons", childId],
        queryFn: () => getManualLessonsByChildId(childId),
        enabled: !!childId,
        retry: 1,
    });
}

export function useAddManualLesson(childId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addManualLesson,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manualLessons", childId] });
        },
    });
}
