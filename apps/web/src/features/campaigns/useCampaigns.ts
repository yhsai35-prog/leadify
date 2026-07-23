import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Campaign,
  CampaignBatchResult,
  CampaignDetail,
  CampaignRecipient,
  CampaignStatus,
  CreateCampaignInput,
  GenerateCampaignOutreachInput,
  LaunchCampaignInput,
  SetCampaignRecipientsInput,
  UpdateCampaignInput,
  WhatsappMessage,
  WhatsappMessageEvent,
} from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiClient.get<{ data: Campaign[] }>("/campaigns").then((r) => r.data),
  });
}

export function useCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaigns", campaignId],
    queryFn: () => apiClient.get<{ data: CampaignDetail }>(`/campaigns/${campaignId}`).then((r) => r.data),
    enabled: Boolean(campaignId),
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => apiClient.post<{ data: Campaign }>("/campaigns", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCampaignInput) =>
      apiClient.patch<{ data: Campaign }>(`/campaigns/${campaignId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    },
  });
}

export function useRemoveLeadsFromCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: string[]) => apiClient.delete(`/campaigns/${campaignId}/leads`, { leadIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    },
  });
}

export function useAddLeadsToCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: string[]) => apiClient.post(`/campaigns/${campaignId}/leads`, { leadIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    },
  });
}

export function useGenerateCampaignEmails(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateCampaignOutreachInput = {}) =>
      apiClient.post<{ data: CampaignBatchResult }>(`/campaigns/${campaignId}/generate-emails`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "conversation"] });
    },
  });
}

export function useSubmitCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ data: CampaignBatchResult }>(`/campaigns/${campaignId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "conversation"] });
    },
  });
}

export function useLaunchCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LaunchCampaignInput) =>
      apiClient.post<{ data: CampaignBatchResult }>(`/campaigns/${campaignId}/launch`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "conversation"] });
    },
  });
}

export function useCampaignConversation(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "conversation"],
    queryFn: () =>
      apiClient
        .get<{ data: { messages: WhatsappMessage[]; events: WhatsappMessageEvent[] } }>(
          `/campaigns/${campaignId}/conversation`,
        )
        .then((r) => r.data),
    enabled: Boolean(campaignId),
    refetchInterval: 15_000,
  });
}

export function useToggleCampaignRecipient(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, selected }: { contactId: string; selected: boolean }) =>
      apiClient.patch<{ data: CampaignRecipient }>(`/campaigns/${campaignId}/recipients/${contactId}`, {
        selected,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    },
  });
}

export function useSetCampaignRecipients(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetCampaignRecipientsInput) =>
      apiClient.put<{ data: CampaignRecipient[] }>(`/campaigns/${campaignId}/recipients`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    },
  });
}

export function useAddManualCampaignRecipient(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { phone?: string; email?: string; label?: string }) =>
      apiClient.post<{ data: CampaignRecipient[] }>(`/campaigns/${campaignId}/recipients/manual`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    },
  });
}

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["draft", "active", "paused", "completed"];
