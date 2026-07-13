import type { Request, Response } from "express";
import type { KnowledgeBaseArticle } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { knowledgeBaseRepository } from "../repositories/knowledgeBaseRepository.js";
import { knowledgeBaseFileService } from "../services/knowledgeBase/knowledgeBaseFileService.js";
import { knowledgeBaseExtractionService } from "../services/knowledgeBase/knowledgeBaseExtractionService.js";
import { generateEmbedding } from "../services/embeddings/embeddingsProvider.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/errors.js";

/** Embedding vectors are internal-only; strip them before any response leaves the API. */
function toPublicArticle(article: KnowledgeBaseArticle): Omit<KnowledgeBaseArticle, "embedding"> {
  const { embedding: _embedding, ...rest } = article;
  return rest;
}

/** Best-effort: qualification/outreach/Copilot degrade gracefully without embeddings, so a failure here must never block saving the article. */
async function embedArticle(id: string, title: string, content: string): Promise<void> {
  try {
    const embedding = await generateEmbedding(`${title}\n\n${content}`);
    await knowledgeBaseRepository.setEmbedding(id, embedding);
  } catch (err) {
    logger.warn({ err, articleId: id }, "Failed to generate knowledge base embedding");
  }
}

export const knowledgeBaseController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const articles = await knowledgeBaseRepository.listCurrent(req.user!.organizationId);
    res.json({ data: articles.map(toPublicArticle) });
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeBaseRepository.findById(req.params.id as string, req.user!.organizationId);
    if (!article) throw ApiError.notFound("Article not found");
    res.json({ data: toPublicArticle(article) });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeBaseRepository.create(req.user!.organizationId, req.body, req.user!.id);
    res.status(201).json({ data: toPublicArticle(article) });
    void embedArticle(article.id, article.title, article.content);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeBaseRepository.update(
      req.params.id as string,
      req.user!.organizationId,
      req.body,
      req.user!.id,
    );
    res.json({ data: toPublicArticle(article) });
    if (req.body.content || req.body.title) {
      void embedArticle(article.id, article.title, article.content);
    }
  }),

  publishUpdate: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeBaseRepository.publishUpdate(
      req.params.id as string,
      req.user!.organizationId,
      req.user!.id,
    );
    res.json({ data: toPublicArticle(article) });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await knowledgeBaseRepository.softDelete(req.params.id as string, req.user!.organizationId);
    res.status(204).send();
  }),

  /** Accepts a PDF/DOCX upload, extracts its text into a new article, stores the original file, and embeds it. */
  upload: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw ApiError.badRequest("Attach a PDF or DOCX file to upload.");

    const extractedText = await knowledgeBaseExtractionService.extractText(file.buffer, file.mimetype);
    const title = req.body.title?.trim() || file.originalname.replace(/\.[^.]+$/, "");

    const article = await knowledgeBaseRepository.create(
      req.user!.organizationId,
      {
        title,
        content: extractedText,
        category: req.body.category,
        sourceType: "file",
        sourceFilename: file.originalname,
        sourceMimeType: file.mimetype,
      },
      req.user!.id,
    );

    try {
      const storagePath = await knowledgeBaseFileService.storeSourceFile(
        req.user!.organizationId,
        article.id,
        file.originalname,
        file.buffer,
        file.mimetype,
      );
      await knowledgeBaseRepository.setSourceStoragePath(article.id, req.user!.organizationId, storagePath);
    } catch (err) {
      logger.warn({ err, articleId: article.id }, "Failed to store original knowledge base source file");
    }

    res.status(201).json({ data: toPublicArticle(article) });
    void embedArticle(article.id, article.title, article.content);
  }),
};
