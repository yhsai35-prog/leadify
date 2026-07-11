import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { approvalService } from "../services/approval/approvalService.js";

export const approvalController = {
  listPending: asyncHandler(async (req: Request, res: Response) => {
    const campaignId = req.query.campaignId as string | undefined;
    const items = await approvalService.listPending(campaignId, req.user!.id, req.user!.role);
    res.json({ data: items });
  }),

  listReadyToSend: asyncHandler(async (req: Request, res: Response) => {
    const campaignId = req.query.campaignId as string | undefined;
    const items = await approvalService.listReadyToSend(campaignId, req.user!.id, req.user!.role);
    res.json({ data: items });
  }),

  submit: asyncHandler(async (req: Request, res: Response) => {
    const approval = await approvalService.submit(req.params.id as string, req.user!.id);
    res.status(201).json({ data: approval });
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const result = await approvalService.approve(req.params.id as string, req.user!.id, req.user!.role);
    res.json({ data: result });
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const approval = await approvalService.reject(
      req.params.id as string,
      req.user!.id,
      req.body.reviewerNotes,
      req.user!.role,
    );
    res.json({ data: approval });
  }),

  editAndApprove: asyncHandler(async (req: Request, res: Response) => {
    const result = await approvalService.editAndApprove(
      req.params.id as string,
      req.user!.id,
      req.body.editedContent,
      req.user!.role,
      req.body.reviewerNotes,
    );
    res.json({ data: result });
  }),

  schedule: asyncHandler(async (req: Request, res: Response) => {
    await approvalService.schedule(req.params.id as string, req.user!.id, req.body.scheduledAt);
    res.status(204).send();
  }),

  confirmSent: asyncHandler(async (req: Request, res: Response) => {
    const result = await approvalService.confirmManualSent(req.params.id as string, req.user!.id);
    res.json({ data: result });
  }),
};
