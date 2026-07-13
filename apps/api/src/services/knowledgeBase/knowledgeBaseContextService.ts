import { generateEmbedding } from "../embeddings/embeddingsProvider.js";
import { knowledgeBaseRepository } from "../../repositories/knowledgeBaseRepository.js";
import { logger } from "../../config/logger.js";

export interface KnowledgeBaseContextArticle {
  title: string;
  category: string;
  excerpt: string;
}

const EXCERPT_MAX_CHARS = 800;

/**
 * Embeds `queryText` and retrieves the most relevant current knowledge base
 * articles for an organization. Used to ground AI qualification, outreach,
 * and Copilot answers in the tenant's own product/case-study content.
 *
 * Best-effort and non-fatal: qualification/outreach/Copilot must never fail
 * just because the embeddings provider or vector search is unavailable.
 */
export const knowledgeBaseContextService = {
  async getRelevantArticles(
    organizationId: string,
    queryText: string,
    limit = 3,
  ): Promise<KnowledgeBaseContextArticle[]> {
    if (!queryText.trim()) return [];
    try {
      const embedding = await generateEmbedding(queryText);
      const matches = await knowledgeBaseRepository.searchByEmbedding(organizationId, embedding, limit);
      return matches.map((m) => ({
        title: m.title,
        category: m.category,
        excerpt: m.content.length > EXCERPT_MAX_CHARS ? `${m.content.slice(0, EXCERPT_MAX_CHARS)}...` : m.content,
      }));
    } catch (err) {
      logger.warn({ err, organizationId }, "Knowledge base retrieval failed; continuing without KB context");
      return [];
    }
  },

  /** Renders retrieved articles as a prompt-ready text block, or an empty string if none matched. */
  formatForPrompt(articles: KnowledgeBaseContextArticle[]): string {
    if (articles.length === 0) return "";
    return articles.map((a) => `### ${a.title} (${a.category})\n${a.excerpt}`).join("\n\n");
  },
};
