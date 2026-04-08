import { useQuery } from "@tanstack/react-query";
import { getParentProfile } from "../../Services/apiAuth";

export function useParentProfile() {
    return useQuery({
        queryKey: ["parentProfile"],
        queryFn: getParentProfile,
        retry: 1,
    });
}
