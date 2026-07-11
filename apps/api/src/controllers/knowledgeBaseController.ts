import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { knowledgeBaseRepository } from "../repositories/knowledgeBaseRepository.js";
import { ApiError } from "../utils/errors.js";

export const knowledgeBaseController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const articles = await knowledgeBaseRepository.listCurrent(req.user!.organizationId);
    res.json({ data: articles });
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeBaseRepository.findById(req.params.id as string, req.user!.organizationId);
    if (!article) throw ApiError.notFound("Article not found");
    res.json({ data: article });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeBaseRepository.create(
      req.user!.organizationId,
      req.body,
      req.user!.id,
    );
    res.status(201).json({ data: article });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeBaseRepository.update(
      req.params.id as string,
      req.user!.organizationId,
      req.body,
      req.user!.id,
    );
    res.json({ data: article });
  }),

  publishUpdate: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeBaseRepository.publishUpdate(
      req.params.id as string,
      req.user!.organizationId,
      req.user!.id,
    );
    res.json({ data: article });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await knowledgeBaseRepository.softDelete(req.params.id as string, req.user!.organizationId);
    res.status(204).send();
  }),
};
