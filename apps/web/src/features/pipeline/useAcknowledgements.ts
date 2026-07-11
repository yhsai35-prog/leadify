import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OutreachAcknowledgement, OutreachChannel } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useLeadAcknowledgements(leadId: string | undefined) {
  return useQuery({
    queryKey: ["leads", leadId, "acknowledgements"],
    queryFn: () =>
      apiClient.get<{ data: OutreachAcknowledgement[] }>(`/leads/${leadId}/acknowledgements`).then((r) => r.data),
    enabled: Boolean(leadId),
  });
}

export function useAcknowledgeOutreach(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      channel,
      acknowledged,
    }: {
      contactId: string;
      channel: OutreachChannel;
      acknowledged: boolean;
    }) =>
      apiClient
        .put<{ data: OutreachAcknowledgement }>(`/leads/${leadId}/contacts/${contactId}/acknowledge`, {
          channel,
          acknowledged,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", leadId, "acknowledgements"] });
      queryClient.invalidateQueries({ queryKey: ["leads", leadId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["nurturing"] });
    },
  });
}
