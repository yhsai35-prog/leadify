import type { Request, Response } from "express";
import { ROLE_RANK, UserRole } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { analyticsService } from "../services/analytics/analyticsService.js";
import { resolveAnalyticsScope } from "../utils/analyticsScope.js";
import { ApiError } from "../utils/errors.js";

function scopeFromReq(req: Request) {
  return resolveAnalyticsScope(req);
}

export const analyticsController = {
  kpis: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.kpis(req.user!.organizationId, scopeFromReq(req)) });
  }),
  pipeline: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.pipelineFunnel(req.user!.organizationId, scopeFromReq(req)) });
  }),
  industries: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.industryBreakdown(req.user!.organizationId, scopeFromReq(req)) });
  }),
  states: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.stateBreakdown(req.user!.organizationId, scopeFromReq(req)) });
  }),
  cities: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.cityBreakdown(req.user!.organizationId, scopeFromReq(req)) });
  }),
  conversion: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.conversionByStage(req.user!.organizationId, scopeFromReq(req)) });
  }),
  funnelConversion: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.funnelConversion(req.user!.organizationId, scopeFromReq(req)) });
  }),
  trends: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.trends(req.user!.organizationId, scopeFromReq(req)) });
  }),
  actionQueue: asyncHandler(async (req: Request, res: Response) => {
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 10;
    res.json({
      data: await analyticsService.actionQueue(req.user!.organizationId, scopeFromReq(req), limit),
    });
  }),
  repPerformance: asyncHandler(async (req: Request, res: Response) => {
    const canView = ROLE_RANK[req.user!.role] >= ROLE_RANK[UserRole.ADMIN];
    if (!canView) throw ApiError.forbidden("Rep performance is available to admins only");
    res.json({ data: await analyticsService.repPerformance(req.user!.organizationId, scopeFromReq(req)) });
  }),
  emailEngagement: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.emailEngagement(req.user!.organizationId, scopeFromReq(req)) });
  }),
  discovery: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.discoveryFunnel(req.user!.organizationId, scopeFromReq(req)) });
  }),
  leadQuality: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.leadQuality(req.user!.organizationId, scopeFromReq(req)) });
  }),
  campaigns: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await analyticsService.campaignPerformance(req.user!.organizationId, scopeFromReq(req)) });
  }),
};
