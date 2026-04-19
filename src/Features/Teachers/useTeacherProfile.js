import { useQuery } from "@tanstack/react-query";
import { getTeacherProfile } from "../../Services/apiAuth";

export function useTeacherProfile(enabled = true) {
    return useQuery({
        queryKey: ["teacherProfile"],
        queryFn: getTeacherProfile,
        enabled,
        retry: 1,
    });
}
