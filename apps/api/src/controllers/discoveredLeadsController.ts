import type { Request, Response } from "express";
import type { DiscoveredLeadListQuery } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { discoveredLeadsService } from "../services/discovery/discoveredLeadsService.js";

export const discoveredLeadsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as DiscoveredLeadListQuery;
    const { data, total } = await discoveredLeadsService.list(req.user!.organizationId, query);
    res.json({ data, meta: { total, page: query.page, limit: query.limit } });
  }),

  promote: asyncHandler(async (req: Request, res: Response) => {
    const result = await discoveredLeadsService.promote(req.user!.organizationId, req.user!.id, req.body.ids);
    res.status(201).json({ data: result });
  }),
};
