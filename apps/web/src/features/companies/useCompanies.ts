import { useQuery } from "@tanstack/react-query";
import type { Company, Contact } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useCompanyContacts(companyId: string | undefined) {
  return useQuery({
    queryKey: ["companies", companyId, "contacts"],
    queryFn: () => apiClient.get<{ data: Contact[] }>(`/companies/${companyId}/contacts`).then((r) => r.data),
    enabled: Boolean(companyId),
  });
}

export function useCompanies(params: URLSearchParams) {
  return useQuery({
    queryKey: ["companies", params.toString()],
    queryFn: () => apiClient.get<{ data: Company[]; meta: { total: number } }>(`/companies?${params.toString()}`),
  });
}

export function useCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["companies", companyId],
    queryFn: () => apiClient.get<{ data: Company }>(`/companies/${companyId}`).then((r) => r.data),
    enabled: Boolean(companyId),
  });
}
