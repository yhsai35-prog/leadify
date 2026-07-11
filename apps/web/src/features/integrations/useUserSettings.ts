import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserSettings, UpdateUserSettingsInput } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useUserSettings() {
  return useQuery({
    queryKey: ["user-settings"],
    queryFn: () => apiClient.get<{ data: UserSettings }>("/users/me/settings").then((r) => r.data),
  });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserSettingsInput) =>
      apiClient.patch<{ data: UserSettings }>("/users/me/settings", input).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });
}
