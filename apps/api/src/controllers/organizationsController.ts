import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { organizationsService } from "../services/organizations/organizationsService.js";
import { logoService } from "../services/organizations/logoService.js";

export const organizationsController = {
  getCurrent: asyncHandler(async (req: Request, res: Response) => {
    const org = await organizationsService.getCurrent(req.user!.organizationId);
    res.json({ data: org });
  }),

  updateCurrent: asyncHandler(async (req: Request, res: Response) => {
    const org = await organizationsService.updateCurrent(req.user!.organizationId, req.body);
    res.json({ data: org });
  }),

  uploadLogo: asyncHandler(async (req: Request, res: Response) => {
    const logoUrl = await logoService.uploadLogo(req.user!.organizationId, req.body.fileBase64, req.body.contentType);
    res.json({ data: { logoUrl } });
  }),

  removeLogo: asyncHandler(async (req: Request, res: Response) => {
    await logoService.removeLogo(req.user!.organizationId);
    res.status(204).end();
  }),
};
