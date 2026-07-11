import type { Request, Response } from "express";
import { UserRole } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { usersRepository } from "../repositories/usersRepository.js";
import { auditLogsRepository } from "../repositories/auditLogsRepository.js";
import { setUserStatus } from "../services/users/userStatusService.js";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/errors.js";

export const authController = {
  me: asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: req.user });
  }),

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const users = await usersRepository.list(req.user!.organizationId);
    res.json({ data: users });
  }),

  inviteUser: asyncHandler(async (req: Request, res: Response) => {
    const { email, fullName, role } = req.body;

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: env.WEB_APP_URL,
    });
    if (error || !invited.user) throw ApiError.internal(error?.message ?? "Failed to invite user via Supabase Auth");

    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: invited.user.id,
      organization_id: req.user!.organizationId,
      email,
      full_name: fullName,
      role,
    });
    if (insertError) throw ApiError.conflict(insertError.message);

    await auditLogsRepository.record({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      action: "invite_user",
      resourceType: "user",
      resourceId: invited.user.id,
      afterState: { email, role },
    });

    res.status(201).json({ data: { id: invited.user.id, email, fullName, role } });
  }),

  updateUserRole: asyncHandler(async (req: Request, res: Response) => {
    const targetId = req.params.id as string;
    const target = await usersRepository.findById(targetId);
    if (!target || target.organizationId !== req.user!.organizationId) {
      throw ApiError.notFound("User not found");
    }

    const nextRole = req.body.role as UserRole;
    if (
      target.role === UserRole.SUPER_ADMIN &&
      nextRole !== UserRole.SUPER_ADMIN &&
      (await usersRepository.countActiveSuperAdmins(req.user!.organizationId)) <= 1
    ) {
      throw ApiError.conflict("Cannot change the role of the last active super admin.");
    }

    const updated = await usersRepository.updateRole(targetId, nextRole);
    await auditLogsRepository.record({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      action: "update_user_role",
      resourceType: "user",
      resourceId: targetId,
      afterState: { role: nextRole },
    });
    res.json({ data: updated });
  }),

  /**
   * Reversible enable/disable. Tenant admins may only act on users in their
   * own organization; super admins manage any tenant via /v1/tenants.
   */
  setUserStatus: asyncHandler(async (req: Request, res: Response) => {
    const target = await usersRepository.findById(req.params.id as string);
    if (!target || target.organizationId !== req.user!.organizationId) {
      throw ApiError.notFound("User not found");
    }

    const updated = await setUserStatus(target, req.body.isActive, req.user!);
    res.json({ data: updated });
  }),

  removeUser: asyncHandler(async (req: Request, res: Response) => {
    const targetId = req.params.id as string;
    if (targetId === req.user!.id) {
      throw ApiError.forbidden("You cannot remove your own account.");
    }

    const target = await usersRepository.findById(targetId);
    if (!target || target.organizationId !== req.user!.organizationId) {
      throw ApiError.notFound("User not found");
    }
    if (!target.isActive) {
      throw ApiError.conflict("This user has already been removed.");
    }

    if (
      target.role === UserRole.SUPER_ADMIN &&
      (await usersRepository.countActiveSuperAdmins(req.user!.organizationId)) <= 1
    ) {
      throw ApiError.conflict("Cannot remove the last active super admin.");
    }

    const updated = await usersRepository.deactivate(targetId);

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
      ban_duration: "876000h",
    });
    if (banError) throw ApiError.internal(banError.message);

    await auditLogsRepository.record({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      action: "remove_user",
      resourceType: "user",
      resourceId: targetId,
      afterState: { email: target.email, isActive: false },
    });

    res.json({ data: updated });
  }),
};
