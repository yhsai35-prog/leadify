import { useQuery } from "@tanstack/react-query";
import type {
  ActionQueueItem,
  CampaignPerformanceRow,
  DashboardKpis,
  DiscoveryFunnelStats,
  EmailEngagementStats,
  FunnelConversionStep,
  LeadQualityStats,
  RepPerformanceRow,
  TrendPoint,
} from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export interface DashboardQueryParams {
  userId?: string;
  from?: string;
  to?: string;
}

function buildQuery(path: string, params?: DashboardQueryParams): string {
  const search = new URLSearchParams();
  if (params?.userId) search.set("userId", params.userId);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function useDashboardKpis(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "kpis", params],
    queryFn: () => apiClient.get<{ data: DashboardKpis }>(buildQuery("/analytics/kpis", params)).then((r) => r.data),
  });
}

export function usePipelineFunnel(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "pipeline", params],
    queryFn: () =>
      apiClient.get<{ data: Record<string, number> }>(buildQuery("/analytics/pipeline", params)).then((r) => r.data),
  });
}

export function useFunnelConversion(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "funnel-conversion", params],
    queryFn: () =>
      apiClient
        .get<{ data: FunnelConversionStep[] }>(buildQuery("/analytics/funnel-conversion", params))
        .then((r) => r.data),
  });
}

export function useIndustryBreakdown(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "industries", params],
    queryFn: () =>
      apiClient.get<{ data: Record<string, number> }>(buildQuery("/analytics/industries", params)).then((r) => r.data),
  });
}

export function useStateBreakdown(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "states", params],
    queryFn: () =>
      apiClient.get<{ data: Record<string, number> }>(buildQuery("/analytics/states", params)).then((r) => r.data),
  });
}

export function useCityBreakdown(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "cities", params],
    queryFn: () =>
      apiClient
        .get<{ data: Array<{ city: string; state: string; count: number }> }>(buildQuery("/analytics/cities", params))
        .then((r) => r.data),
  });
}

export function useCampaignPerformance(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "campaigns", params],
    queryFn: () =>
      apiClient.get<{ data: CampaignPerformanceRow[] }>(buildQuery("/analytics/campaigns", params)).then((r) => r.data),
  });
}

export function useActivityTrends(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "trends", params],
    queryFn: () =>
      apiClient.get<{ data: TrendPoint[] }>(buildQuery("/analytics/trends", params)).then((r) => r.data),
  });
}

export function useActionQueue(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "action-queue", params],
    queryFn: () =>
      apiClient.get<{ data: ActionQueueItem[] }>(buildQuery("/analytics/action-queue", params)).then((r) => r.data),
  });
}

export function useRepPerformance(params?: DashboardQueryParams, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "rep-performance", params],
    queryFn: () =>
      apiClient
        .get<{ data: RepPerformanceRow[] }>(buildQuery("/analytics/rep-performance", params))
        .then((r) => r.data),
    enabled,
  });
}

export function useEmailEngagement(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "email-engagement", params],
    queryFn: () =>
      apiClient
        .get<{ data: EmailEngagementStats }>(buildQuery("/analytics/email-engagement", params))
        .then((r) => r.data),
  });
}

export function useDiscoveryFunnel(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "discovery", params],
    queryFn: () =>
      apiClient
        .get<{ data: DiscoveryFunnelStats }>(buildQuery("/analytics/discovery", params))
        .then((r) => r.data),
  });
}

export function useLeadQuality(params?: DashboardQueryParams) {
  return useQuery({
    queryKey: ["analytics", "lead-quality", params],
    queryFn: () =>
      apiClient.get<{ data: LeadQualityStats }>(buildQuery("/analytics/lead-quality", params)).then((r) => r.data),
  });
}
