import { useQuery } from "@tanstack/react-query";
import { getTeacherProfile } from "../../Services/apiAuth";

export function useTeacherProfile() {
    return useQuery({
        queryKey: ["teacherProfile"],
        queryFn: getTeacherProfile,
        retry: 1,
    });
}
