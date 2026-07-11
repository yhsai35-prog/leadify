import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { campaignService } from "../services/campaigns/campaignService.js";

export const campaignsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const campaigns = await campaignService.list(req.user!.organizationId);
    res.json({ data: campaigns });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const campaign = await campaignService.create(req.user!.organizationId, req.body, req.user!.id);
    res.status(201).json({ data: campaign });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const detail = await campaignService.getDetail(req.user!.organizationId, req.params.id as string);
    res.json({ data: detail });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const campaign = await campaignService.update(req.user!.organizationId, req.params.id as string, req.body);
    res.json({ data: campaign });
  }),

  addLeads: asyncHandler(async (req: Request, res: Response) => {
    await campaignService.addLeads(req.user!.organizationId, req.params.id as string, req.body.leadIds);
    res.status(204).send();
  }),

  removeLeads: asyncHandler(async (req: Request, res: Response) => {
    await campaignService.removeLeads(req.user!.organizationId, req.params.id as string, req.body.leadIds);
    res.status(204).send();
  }),

  status: asyncHandler(async (req: Request, res: Response) => {
    const status = await campaignService.getStatus(req.user!.organizationId, req.params.id as string);
    res.json({ data: status });
  }),

  generateEmails: asyncHandler(async (req: Request, res: Response) => {
    const result = await campaignService.generateEmails(
      req.user!.organizationId,
      req.params.id as string,
      req.user!.id,
    );
    res.json({ data: result });
  }),

  submitAll: asyncHandler(async (req: Request, res: Response) => {
    const result = await campaignService.submitAll(
      req.user!.organizationId,
      req.params.id as string,
      req.user!.id,
    );
    res.json({ data: result });
  }),

  launch: asyncHandler(async (req: Request, res: Response) => {
    const result = await campaignService.launch(
      req.user!.organizationId,
      req.params.id as string,
      req.user!.id,
      req.body,
    );
    res.json({ data: result });
  }),
};
