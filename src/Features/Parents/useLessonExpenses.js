import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addLessonExpense,
    getLessonExpensesByChildId,
    markLessonExpensePaid,
    setLessonExpenseStatus,
} from "../../Services/apiLessonExpenses";

export function useLessonExpensesByChild(childId) {
    return useQuery({
        queryKey: ["lessonExpenses", childId],
        queryFn: () => getLessonExpensesByChildId(childId),
        enabled: !!childId,
        retry: 1,
    });
}

export function useAddLessonExpense(childId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addLessonExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lessonExpenses", childId] });
        },
    });
}

export function useMarkLessonExpensePaid(childId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markLessonExpensePaid,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lessonExpenses", childId] });
        },
    });
}

export function useSetLessonExpenseStatus(childId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: setLessonExpenseStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lessonExpenses", childId] });
        },
    });
}
