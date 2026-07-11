import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InviteUserInput, UpdateUserRoleInput, User } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<{ data: User[] }>("/users").then((r) => r.data),
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => apiClient.post<{ data: User }>("/users/invite", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string } & UpdateUserRoleInput) =>
      apiClient.patch<{ data: User }>(`/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch<{ data: User }>(`/users/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ data: User }>(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
