import { useQuery } from "@tanstack/react-query";
import type { AiUsageByUserRow, AiUsageSummaryRow } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useAiUsageSummary() {
  return useQuery({
    queryKey: ["ai-usage", "summary"],
    queryFn: () => apiClient.get<{ data: AiUsageSummaryRow[] }>("/ai-usage/summary").then((r) => r.data),
  });
}

export function useAiUsageByUser() {
  return useQuery({
    queryKey: ["ai-usage", "by-user"],
    queryFn: () => apiClient.get<{ data: AiUsageByUserRow[] }>("/ai-usage/by-user").then((r) => r.data),
  });
}
