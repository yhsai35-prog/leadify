import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { companiesRepository } from "../repositories/companiesRepository.js";
import { researchService } from "../services/research/researchService.js";
import { ensureExistingClientFirmographics } from "../services/companies/existingClientEnrichmentService.js";
import { ApiError } from "../utils/errors.js";

export const companiesController = {
  getById: asyncHandler(async (req: Request, res: Response) => {
    const found = await companiesRepository.findById(req.params.id as string);
    if (!found) throw ApiError.notFound("Company not found");
    const company = await ensureExistingClientFirmographics(found);
    res.json({ data: company });
  }),

  triggerResearch: asyncHandler(async (req: Request, res: Response) => {
    const intelligence = await researchService.researchCompany(
      req.params.id as string,
      req.body.leadId as string | undefined,
      req.user!.id,
    );
    res.status(201).json({ data: intelligence });
  }),

  getIntelligence: asyncHandler(async (req: Request, res: Response) => {
    const intelligence = await researchService.getLatestIntelligence(req.params.id as string);
    res.json({ data: intelligence });
  }),
};
