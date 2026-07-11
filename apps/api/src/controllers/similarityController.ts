import type { Request, Response } from "express";
import type { SimilarityProspectsQuery } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { similarityService } from "../services/similarity/similarityService.js";
import { ApiError } from "../utils/errors.js";

export const similarityController = {
  getMatches: asyncHandler(async (req: Request, res: Response) => {
    const matches = await similarityService.getMatchesForLead(req.params.id as string);
    res.json({ data: matches });
  }),

  recompute: asyncHandler(async (req: Request, res: Response) => {
    const matches = await similarityService.computeSimilarityForLead(req.params.id as string, req.user!.id);
    res.status(201).json({ data: matches });
  }),

  findProspects: asyncHandler(async (req: Request, res: Response) => {
    const { clientName, limit } = req.query as unknown as SimilarityProspectsQuery;
    const result = await similarityService.findProspectsSimilarToClient(req.user!.organizationId, clientName, limit);
    res.json({ data: result });
  }),

  getClientProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await similarityService.getProfileForCompany(req.params.companyId as string);
    if (!profile) throw ApiError.notFound("No existing client profile for this company");
    res.json({ data: profile });
  }),

  listClients: asyncHandler(async (req: Request, res: Response) => {
    const result = await similarityService.listClientsWithStats(req.user!.organizationId);
    res.json({ data: result });
  }),
};
