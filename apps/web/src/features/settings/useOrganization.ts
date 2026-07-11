import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Organization, UpdateOrganizationSettingsInput } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useOrganization() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: () => apiClient.get<{ data: Organization }>("/organizations/current").then((r) => r.data),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationSettingsInput) =>
      apiClient.patch<{ data: Organization }>("/organizations/current", input).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization"] }),
  });
}

/** Reads a File into base64 (without the data: URL prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useUploadOrgLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fileBase64 = await fileToBase64(file);
      return apiClient
        .post<{ data: { logoUrl: string } }>("/organizations/current/logo", {
          fileBase64,
          contentType: file.type,
        })
        .then((r) => r.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization"] }),
  });
}
