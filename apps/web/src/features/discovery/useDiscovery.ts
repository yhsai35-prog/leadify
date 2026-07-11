import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DiscoveredLead, ApolloSearchInput } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export interface ApolloOrganizationResult {
  apolloId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  estimatedRevenueInrCr: number | null;
  city: string | null;
}

export interface ApolloPersonResult {
  apolloId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone?: string | null;
  title: string | null;
  linkedinUrl: string | null;
  organizationApolloId: string;
  hasEmail?: boolean;
}

interface ApolloSearchResponse {
  organizations: ApolloOrganizationResult[];
  people: ApolloPersonResult[];
  totalResults: number;
  batchId?: string;
  discoveredLeads?: DiscoveredLead[];
}

export function useApolloSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApolloSearchInput) =>
      apiClient.post<{ data: ApolloSearchResponse }>("/discovery/apollo/search", input).then((r) => {
        const data = r.data;
        return {
          organizations: data.organizations,
          people: data.people,
          totalResults: data.totalResults,
          savedCount: data.discoveredLeads?.length ?? data.organizations.length,
        };
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovered-leads"] });
    },
  });
}
