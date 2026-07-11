import type { KnowledgeBaseArticle } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

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
    input: { title: string; content: string; category: string },
    createdBy: string,
  ): Promise<KnowledgeBaseArticle> {
    const { data, error } = await supabaseAdmin
      .from("knowledge_base_articles")
      .insert({
        organization_id: organizationId,
        title: input.title,
        content: input.content,
        category: input.category,
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
    input: Partial<{ title: string; content: string; category: string }>,
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
