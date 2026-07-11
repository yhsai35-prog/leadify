import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Campaign,
  CampaignBatchResult,
  CampaignDetail,
  CampaignStatus,
  CreateCampaignInput,
  LaunchCampaignInput,
  UpdateCampaignInput,
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
    mutationFn: (leadIds: string[]) =>
      apiClient.delete(`/campaigns/${campaignId}/leads`, { leadIds }),
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
    mutationFn: () => apiClient.post<{ data: CampaignBatchResult }>(`/campaigns/${campaignId}/generate-emails`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
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
    },
  });
}

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["draft", "active", "paused", "completed"];
