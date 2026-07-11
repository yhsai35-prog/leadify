import { useMutation, useQuery } from "@tanstack/react-query";
import type { CopilotMessage } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useCopilotSuggestions() {
  return useQuery({
    queryKey: ["copilot", "suggestions"],
    queryFn: () => apiClient.get<{ data: string[] }>("/copilot/suggestions").then((r) => r.data),
  });
}

export function useCopilotChat() {
  return useMutation({
    mutationFn: (message: string) => apiClient.post<{ data: CopilotMessage[] }>("/copilot/chat", { message }).then((r) => r.data),
  });
}
