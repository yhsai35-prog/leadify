import { useQuery } from "@tanstack/react-query";
import type { NurturingLead } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useLeadNurturing(userId?: string) {
  return useQuery({
    queryKey: ["nurturing", userId],
    queryFn: () =>
      apiClient
        .get<{ data: NurturingLead[] }>(userId ? `/nurturing?userId=${userId}` : "/nurturing")
        .then((r) => r.data),
  });
}
