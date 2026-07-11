import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get<{ data: Notification[] }>("/notifications").then((r) => r.data),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
