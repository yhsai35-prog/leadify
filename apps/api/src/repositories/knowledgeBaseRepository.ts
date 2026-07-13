import type { KnowledgeBaseArticle } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export interface KnowledgeBaseSearchMatch {
  id: string;
  title: string;
  category: string;
  content: string;
  distance: number;
}

export const knowledgeBaseRepository = {
  async listCurrent(organizationId: string): Promise<KnowledgeBaseArticle[]> {
    const { data, error } = await supabaseAdmin
      .from("knowledge_base_articles")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    if (error) throw ApiError.internal(error.message);
    return toCamel<KnowledgeBaseArticle[]>(data ?? []);
  },

  async findById(id: string, organizationId: string): Promise<KnowledgeBaseArticle | null> {
    const { data, error } = await supabaseAdmin
      .from("knowledge_base_articles")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<KnowledgeBaseArticle>(data) : null;
  },

  async create(
    organizationId: string,
    input: {
      title: string;
      content: string;
      category: string;
      sourceType?: "manual" | "file";
      sourceFilename?: string | null;
      sourceMimeType?: string | null;
      sourceStoragePath?: string | null;
      embedding?: number[] | null;
    },
    createdBy: string,
  ): Promise<KnowledgeBaseArticle> {
    const { data, error } = await supabaseAdmin
      .from("knowledge_base_articles")
      .insert({
        organization_id: organizationId,
        title: input.title,
        content: input.content,
        category: input.category,
        source_type: input.sourceType ?? "manual",
        source_filename: input.sourceFilename ?? null,
        source_mime_type: input.sourceMimeType ?? null,
        source_storage_path: input.sourceStoragePath ?? null,
        embedding: input.embedding ?? null,
        created_by: createdBy,
        updated_by: createdBy,
      })
      .select("*")
      .single();

    if (error) throw ApiError.internal(error.message);
    return toCamel<KnowledgeBaseArticle>(data);
  },

  async update(
    id: string,
    organizationId: string,
    input: Partial<{ title: string; content: string; category: string; embedding: number[] | null }>,
    updatedBy: string,
  ): Promise<KnowledgeBaseArticle> {
    const { data, error } = await supabaseAdmin
      .from("knowledge_base_articles")
      .update({ ...input, updated_by: updatedBy })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .select("*")
      .single();

    if (error) throw ApiError.internal(error.message);
    if (!data) throw ApiError.notFound("Article not found");
    return toCamel<KnowledgeBaseArticle>(data);
  },

  /** Best-effort embedding backfill; never blocks article creation/edits on embedding failures. */
  async setEmbedding(id: string, embedding: number[]): Promise<void> {
    const { error } = await supabaseAdmin.from("knowledge_base_articles").update({ embedding }).eq("id", id);
    if (error) throw ApiError.internal(error.message);
  },

  async setSourceStoragePath(id: string, organizationId: string, sourceStoragePath: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("knowledge_base_articles")
      .update({ source_storage_path: sourceStoragePath })
      .eq("id", id)
      .eq("organization_id", organizationId);
    if (error) throw ApiError.internal(error.message);
  },

  /** Org-scoped vector search over current articles, via the `match_knowledge_base_articles` RPC. */
  async searchByEmbedding(organizationId: string, embedding: number[], limit = 5): Promise<KnowledgeBaseSearchMatch[]> {
    const { data, error } = await supabaseAdmin.rpc("match_knowledge_base_articles", {
      query_embedding: embedding,
      org_id: organizationId,
      match_count: limit,
    });
    if (error) throw ApiError.internal(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      category: row.category as string,
      content: row.content as string,
      distance: row.distance as number,
    }));
  },

  async publishUpdate(
    id: string,
    organizationId: string,
    updatedBy: string,
  ): Promise<KnowledgeBaseArticle> {
    // Load the current version of the article
    const existing = await this.findById(id, organizationId);
    if (!existing) throw ApiError.notFound("Article not found");
    if (!existing.isCurrent) throw ApiError.badRequest("Can only publish an update from the current version");

    // Mark old version as no longer current
    const { error: archiveError } = await supabaseAdmin
      .from("knowledge_base_articles")
      .update({ is_current: false })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (archiveError) throw ApiError.internal(archiveError.message);

    // Insert a new current version (content is unchanged; admin can edit first if needed)
    const { data, error } = await supabaseAdmin
      .from("knowledge_base_articles")
      .insert({
        organization_id: organizationId,
        title: existing.title,
        content: existing.content,
        category: existing.category,
        version: existing.version + 1,
        is_current: true,
        published_at: new Date().toISOString(),
        created_by: existing.createdBy,
        updated_by: updatedBy,
        embedding: existing.embedding ?? null,
      })
      .select("*")
      .single();

    if (error) throw ApiError.internal(error.message);
    return toCamel<KnowledgeBaseArticle>(data);
  },

  async softDelete(id: string, organizationId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("knowledge_base_articles")
      .update({ is_current: false })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) throw ApiError.internal(error.message);
  },
};
