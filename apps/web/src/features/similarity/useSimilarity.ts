import { useQuery } from "@tanstack/react-query";
import type {
  ExistingClientProfile,
  ExistingClientVertical,
  SimilarityClientsResult,
  SimilarProspectMatch,
} from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export interface SimilarProspectsResult {
  client: {
    companyId: string;
    companyName: string;
    vertical: string;
    profileSummary: string;
  } | null;
  prospects: SimilarProspectMatch[];
}

export function useExistingClients() {
  return useQuery({
    queryKey: ["similarity", "clients"],
    queryFn: () => apiClient.get<{ data: SimilarityClientsResult }>("/similarity/clients").then((r) => r.data),
  });
}

export function useSimilarProspects(clientName: string | undefined) {
  return useQuery({
    queryKey: ["similarity", "prospects", clientName],
    queryFn: () => {
      const params = new URLSearchParams({ clientName: clientName! });
      return apiClient
        .get<{ data: SimilarProspectsResult }>(`/similarity/prospects?${params.toString()}`)
        .then((r) => r.data);
    },
    enabled: Boolean(clientName?.trim()),
  });
}

export function useExistingClientProfile(companyId: string | undefined) {
  return useQuery({
    queryKey: ["similarity", "profile", companyId],
    queryFn: () =>
      apiClient
        .get<{ data: ExistingClientProfile & { companyName: string } }>(`/similarity/clients/${companyId}/profile`)
        .then((r) => r.data),
    enabled: Boolean(companyId),
  });
}

export const VERTICAL_BADGE_VARIANT: Record<
  ExistingClientVertical,
  "info" | "warning" | "success" | "purple" | "pink" | "brown"
> = {
  logistics: "info",
  quick_commerce: "warning",
  retail: "pink",
  ev: "success",
  manufacturing: "purple",
  furniture: "brown",
};

export const ALL_VERTICALS: ExistingClientVertical[] = [
  "logistics",
  "quick_commerce",
  "retail",
  "ev",
  "manufacturing",
  "furniture",
];

export function formatVertical(vertical: string): string {
  return vertical.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function matchPctVariant(pct: number): "success" | "warning" | "outline" {
  if (pct >= 70) return "success";
  if (pct >= 50) return "warning";
  return "outline";
}
