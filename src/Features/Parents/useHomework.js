import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addHomework,
    deleteHomework,
    getGroupHomeworksByChildId,
    getHomeworkStatusesByChildAndIds,
    getHomeworksByChildId,
    getPrivateHomeworksByChildId,
} from "../../Services/apiHomework";

export function useHomeworksByChild(childId) {
    return useQuery({
        queryKey: ["homeworks", childId],
        queryFn: () => getHomeworksByChildId(childId),
        enabled: !!childId,
        retry: 1,
    });
}

export function useGroupHomeworksByChild(childId) {
    return useQuery({
        queryKey: ["groupHomeworks", childId],
        queryFn: () => getGroupHomeworksByChildId(childId),
        enabled: !!childId,
        retry: 1,
    });
}

export function usePrivateHomeworksByChild(childId) {
    return useQuery({
        queryKey: ["privateHomeworks", childId],
        queryFn: () => getPrivateHomeworksByChildId(childId),
        enabled: !!childId,
        retry: 1,
    });
}

export function useAddHomework(childId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addHomework,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["homeworks", childId] });
        },
    });
}

export function useDeleteHomework(childId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteHomework,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["homeworks", childId] });
        },
    });
}

export function useHomeworkStatuses(childId, homeworkIds) {
    return useQuery({
        queryKey: ["homeworkStatuses", childId, ...(homeworkIds || [])],
        queryFn: () => getHomeworkStatusesByChildAndIds(childId, homeworkIds),
        enabled: Boolean(childId) && Array.isArray(homeworkIds) && homeworkIds.length > 0,
        retry: 1,
    });
}
