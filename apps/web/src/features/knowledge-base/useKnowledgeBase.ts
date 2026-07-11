import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { KnowledgeBaseArticle, CreateKnowledgeBaseArticleInput, UpdateKnowledgeBaseArticleInput } from "@bluwheelz/shared";
import { apiClient } from "@/lib/apiClient";

const QK = ["knowledge-base"] as const;

export function useKnowledgeBaseArticles() {
  return useQuery({
    queryKey: QK,
    queryFn: () =>
      apiClient.get<{ data: KnowledgeBaseArticle[] }>("/knowledge-base").then((r) => r.data),
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKnowledgeBaseArticleInput) =>
      apiClient.post<{ data: KnowledgeBaseArticle }>("/knowledge-base", input).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUpdateArticle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateKnowledgeBaseArticleInput) =>
      apiClient.patch<{ data: KnowledgeBaseArticle }>(`/knowledge-base/${id}`, input).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK }),
  });
}

export function usePublishUpdate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ data: KnowledgeBaseArticle }>(`/knowledge-base/${id}/publish-update`).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/knowledge-base/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK }),
  });
}
