import type { Request, Response } from "express";
import type { DemoRequest, User } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { tenantsService } from "../services/tenants/tenantsService.js";
import { setUserStatus } from "../services/users/userStatusService.js";
import { usersRepository } from "../repositories/usersRepository.js";
import { demoRequestsRepository } from "../repositories/demoRequestsRepository.js";
import { logoService } from "../services/organizations/logoService.js";
import { ApiError } from "../utils/errors.js";

export const tenantsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const tenants = await tenantsService.list();
    res.json({ data: tenants });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await tenantsService.create(req.body, req.user!.id);
    res.status(201).json({ data: result });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const tenant = await tenantsService.update(req.params.id as string, req.body, req.user!.id);
    res.json({ data: tenant });
  }),

  uploadLogo: asyncHandler(async (req: Request, res: Response) => {
    const logoUrl = await logoService.uploadLogo(req.params.id as string, req.body.fileBase64, req.body.contentType);
    res.json({ data: { logoUrl } });
  }),

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const users = await tenantsService.listUsers(req.params.id as string);
    res.json({ data: users });
  }),

  updateUserStatus: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.params.id as string;
    const target = await usersRepository.findById(req.params.userId as string);
    if (!target || target.organizationId !== tenantId) throw ApiError.notFound("User not found in this tenant");

    const updated: User = await setUserStatus(target, req.body.isActive, req.user!);
    res.json({ data: updated });
  }),

  listDemoRequests: asyncHandler(async (_req: Request, res: Response) => {
    const requests = await demoRequestsRepository.list();
    res.json({ data: requests });
  }),

  updateDemoRequestStatus: asyncHandler(async (req: Request, res: Response) => {
    const updated: DemoRequest = await demoRequestsRepository.updateStatus(
      req.params.requestId as string,
      req.body.status,
    );
    res.json({ data: updated });
  }),
};
