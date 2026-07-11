import type { Request, Response } from "express";
import type { NurturingListQuery } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { nurturingService } from "../services/nurturing/nurturingService.js";

export const nurturingController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.query as unknown as NurturingListQuery;
    const data = await nurturingService.list(req.user!.organizationId, userId);
    res.json({ data });
  }),
};
