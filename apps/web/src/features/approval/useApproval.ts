import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApprovalQueueItem } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export interface ApprovalDecisionResult {
  approval: ApprovalQueueItem;
  sendQueued: boolean;
  notice?: string;
}

export function usePendingApprovals(campaignId?: string) {
  return useQuery({
    queryKey: ["approval-queue", campaignId ?? "all"],
    queryFn: () => {
      const qs = campaignId ? `?campaignId=${campaignId}` : "";
      return apiClient.get<{ data: ApprovalQueueItem[] }>(`/approval-queue${qs}`).then((r) => r.data);
    },
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useReadyToSendApprovals(campaignId?: string) {
  return useQuery({
    queryKey: ["approval-queue", "ready-to-send", campaignId ?? "all"],
    queryFn: () => {
      const qs = campaignId ? `?campaignId=${campaignId}` : "";
      return apiClient
        .get<{ data: ApprovalQueueItem[] }>(`/approval-queue/ready-to-send${qs}`)
        .then((r) => r.data);
    },
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useSubmitForApproval(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emailId: string) => apiClient.post(`/emails/${emailId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    },
  });
}

export function useApproveEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (approvalId: string) =>
      apiClient.post<{ data: ApprovalDecisionResult }>(`/approval-queue/${approvalId}/approve`).then((r) => r.data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useRejectEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ approvalId, reviewerNotes }: { approvalId: string; reviewerNotes: string }) =>
      apiClient.post(`/approval-queue/${approvalId}/reject`, { reviewerNotes }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["approval-queue"] }),
  });
}

export function useEditAndApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      approvalId,
      editedContent,
    }: {
      approvalId: string;
      /** Email fields (bodyText, etc.) or WhatsApp fields (bodyPreview, etc.). */
      editedContent: Record<string, unknown>;
    }) =>
      apiClient
        .post<{ data: ApprovalDecisionResult }>(`/approval-queue/${approvalId}/edit-approve`, { editedContent })
        .then((r) => r.data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useConfirmEmailSent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emailId: string) =>
      apiClient.post<{ data: { emailId: string; sentAt: string } }>(`/emails/${emailId}/confirm-sent`).then((r) => r.data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
