import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Activity,
  CompanyIntelligence,
  Contact,
  Email,
  Lead,
  LeadScore,
  LeadSimilarityMatch,
  Meeting,
  PipelineStatus,
} from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function usePipelineBoard() {
  return useQuery({
    queryKey: ["pipeline", "board"],
    queryFn: () => apiClient.get<{ data: Record<PipelineStatus, Lead[]> }>("/leads/board").then((r) => r.data),
  });
}

export function useLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ["leads", leadId],
    queryFn: () => apiClient.get<{ data: Lead }>(`/leads/${leadId}`).then((r) => r.data),
    enabled: Boolean(leadId),
  });
}

export function useLeadActivities(leadId: string | undefined) {
  return useQuery({
    queryKey: ["leads", leadId, "activities"],
    queryFn: () => apiClient.get<{ data: Activity[] }>(`/leads/${leadId}/activities`).then((r) => r.data),
    enabled: Boolean(leadId),
  });
}

export function useLatestScore(leadId: string | undefined) {
  return useQuery({
    queryKey: ["leads", leadId, "score"],
    queryFn: () => apiClient.get<{ data: LeadScore }>(`/leads/${leadId}/scores/latest`).then((r) => r.data),
    enabled: Boolean(leadId),
    retry: false,
  });
}

export function useCompanyIntelligence(companyId: string | undefined) {
  return useQuery({
    queryKey: ["companies", companyId, "intelligence"],
    queryFn: () => apiClient.get<{ data: CompanyIntelligence }>(`/companies/${companyId}/intelligence`).then((r) => r.data),
    enabled: Boolean(companyId),
    retry: false,
  });
}

export function useSimilarityMatches(leadId: string | undefined) {
  return useQuery({
    queryKey: ["leads", leadId, "similarity"],
    queryFn: () => apiClient.get<{ data: LeadSimilarityMatch[] }>(`/leads/${leadId}/similarity`).then((r) => r.data),
    enabled: Boolean(leadId),
  });
}

export function useLeadEmails(leadId: string | undefined) {
  return useQuery({
    queryKey: ["leads", leadId, "emails"],
    queryFn: () => apiClient.get<{ data: Email[] }>(`/leads/${leadId}/emails`).then((r) => r.data),
    enabled: Boolean(leadId),
  });
}

export function useLeadMeetings(leadId: string | undefined) {
  return useQuery({
    queryKey: ["leads", leadId, "meetings"],
    queryFn: () => apiClient.get<{ data: Meeting[] }>(`/leads/${leadId}/meetings`).then((r) => r.data),
    enabled: Boolean(leadId),
  });
}

function useLeadMutation(leadId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
  };
  return { queryClient, invalidate };
}

export function useQualifyLead(leadId: string) {
  const { invalidate } = useLeadMutation(leadId);
  return useMutation({
    mutationFn: () => apiClient.post<{ data: LeadScore }>(`/leads/${leadId}/qualify`).then((r) => r.data),
    onSuccess: invalidate,
  });
}

export function useTriggerResearch(companyId: string, leadId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ data: CompanyIntelligence }>(`/companies/${companyId}/research`, { leadId }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", companyId, "intelligence"] });
      if (leadId) queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
    },
  });
}

export function useComputeSimilarity(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ data: LeadSimilarityMatch[] }>(`/leads/${leadId}/similarity/compute`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", leadId, "similarity"] }),
  });
}

export function useGenerateEmail(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { contactId: string; type?: "initial" | "follow_up"; tone?: string }) =>
      apiClient.post<{ data: Email }>(`/leads/${leadId}/emails/generate`, input).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", leadId, "emails"] }),
  });
}

export function useRevealContacts(leadId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ data: Contact[] }>(`/leads/${leadId}/reveal-contacts`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
      if (companyId) queryClient.invalidateQueries({ queryKey: ["companies", companyId, "contacts"] });
    },
  });
}

export function useUpdateLeadStatus(leadId: string) {
  const { invalidate } = useLeadMutation(leadId);
  return useMutation({
    mutationFn: (status: PipelineStatus) => apiClient.patch<{ data: Lead }>(`/leads/${leadId}/status`, { status }).then((r) => r.data),
    onSuccess: invalidate,
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, assignedTo }: { leadId: string; assignedTo: string }) =>
      apiClient.patch<{ data: Lead }>(`/leads/${leadId}/assign`, { assignedTo }).then((r) => r.data),
    onSuccess: (_data, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["nurturing"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
    },
  });
}
