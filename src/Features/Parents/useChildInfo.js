import { useQuery } from "@tanstack/react-query";
import { getChildrenByParent, getChildById, getChildByCode } from "../../Services/apiChildren";

// Get all children for a parent
export function useChildrenByParent(parentId) {
    return useQuery({
        queryKey: ["children", parentId],
        queryFn: () => getChildrenByParent(parentId),
        enabled: !!parentId, // Only run query if parentId exists
        retry: 1,
    });
}

// Get a single child by ID
export function useChildById(childId) {
    return useQuery({
        queryKey: ["child", childId],
        queryFn: () => getChildById(childId),
        enabled: !!childId,
        retry: 1,
    });
}

// Get child by student code
export function useChildByCode(studentCode) {
    return useQuery({
        queryKey: ["childByCode", studentCode],
        queryFn: () => getChildByCode(studentCode),
        enabled: !!studentCode,
        retry: 1,
    });
}
