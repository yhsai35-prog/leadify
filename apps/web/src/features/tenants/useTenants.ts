import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateTenantInput,
  DemoRequest,
  Organization,
  TenantSummary,
  UpdateTenantInput,
  User,
} from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";
import { fileToBase64 } from "@/features/settings/useOrganization";

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: () => apiClient.get<{ data: TenantSummary[] }>("/tenants").then((r) => r.data),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTenantInput) =>
      apiClient.post<{ data: { tenant: Organization; adminUserId: string } }>("/tenants", input).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateTenantInput) =>
      apiClient.patch<{ data: Organization }>(`/tenants/${id}`, input).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useUploadTenantLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fileBase64 = await fileToBase64(file);
      return apiClient
        .post<{ data: { logoUrl: string } }>(`/tenants/${id}/logo`, { fileBase64, contentType: file.type })
        .then((r) => r.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useTenantUsers(tenantId: string | null) {
  return useQuery({
    queryKey: ["tenants", tenantId, "users"],
    queryFn: () => apiClient.get<{ data: User[] }>(`/tenants/${tenantId}/users`).then((r) => r.data),
    enabled: !!tenantId,
  });
}

export function useUpdateTenantUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, userId, isActive }: { tenantId: string; userId: string; isActive: boolean }) =>
      apiClient.patch<{ data: User }>(`/tenants/${tenantId}/users/${userId}/status`, { isActive }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", vars.tenantId, "users"] });
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useDemoRequests() {
  return useQuery({
    queryKey: ["demo-requests"],
    queryFn: () => apiClient.get<{ data: DemoRequest[] }>("/tenants/demo-requests").then((r) => r.data),
  });
}

export function useUpdateDemoRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DemoRequest["status"] }) =>
      apiClient.patch<{ data: DemoRequest }>(`/tenants/demo-requests/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-requests"] }),
  });
}
