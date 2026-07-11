import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditLogsRepository } from "../repositories/auditLogsRepository.js";

export const auditController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const logs = await auditLogsRepository.listForOrganization(req.user!.organizationId);
    res.json({ data: logs });
  }),
};
