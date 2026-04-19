import { useQuery } from "@tanstack/react-query";
import { getParentProfile } from "../../Services/apiAuth";

export function useParentProfile(enabled = true) {
    return useQuery({
        queryKey: ["parentProfile"],
        queryFn: getParentProfile,
        enabled,
        retry: 1,
    });
}
