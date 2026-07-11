import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DiscoveredLead, DiscoveredLeadStatus } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useDiscoveredLeads(status: DiscoveredLeadStatus | undefined, page: number, limit: number) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);

  return useQuery({
    queryKey: ["discovered-leads", status ?? "all", page, limit],
    queryFn: () =>
      apiClient
        .get<{ data: DiscoveredLead[]; meta: { total: number; page: number; limit: number } }>(
          `/discovered-leads?${params.toString()}`,
        )
        .then((r) => r),
  });
}

export function usePromoteDiscoveredLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient
        .post<{ data: { promoted: unknown[]; failed: Array<{ id: string; name: string; reason: string }> } }>(
          "/discovered-leads/promote",
          { ids },
        )
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovered-leads"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
