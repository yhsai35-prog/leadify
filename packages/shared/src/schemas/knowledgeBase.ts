import { z } from "zod";

export const createKnowledgeBaseArticleSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.string().min(1).max(100).default("General"),
});
export type CreateKnowledgeBaseArticleInput = z.infer<typeof createKnowledgeBaseArticleSchema>;

export const updateKnowledgeBaseArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  category: z.string().min(1).max(100).optional(),
});
export type UpdateKnowledgeBaseArticleInput = z.infer<typeof updateKnowledgeBaseArticleSchema>;

export interface KnowledgeBaseArticle {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  category: string;
  version: number;
  isCurrent: boolean;
  publishedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
