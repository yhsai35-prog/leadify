import type {
  CreateTenantInput,
  Organization,
  TenantSummary,
  TenantUserInviteResult,
  UpdateTenantInput,
  User,
} from "@bluwheelz/shared";
import { organizationsRepository } from "../../repositories/organizationsRepository.js";
import { usersRepository } from "../../repositories/usersRepository.js";
import { auditLogsRepository } from "../../repositories/auditLogsRepository.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { ApiError } from "../../utils/errors.js";

/**
 * Platform-level tenant management, exposed only to super admins. A tenant is
 * an `organizations` row; its admins/users are `users` rows scoped to it.
 */
export const tenantsService = {
  async list(): Promise<TenantSummary[]> {
    return organizationsRepository.listAll();
  },

  /**
   * Creates the organization and invites every listed user in one step, so a
   * tenant is never left without at least one admin who can manage it. One
   * bad email must never block the rest -- each invite is attempted
   * independently and the per-user outcome is reported back to the caller.
   */
  async create(
    input: CreateTenantInput,
    actingUserId: string,
  ): Promise<{ tenant: Organization; users: TenantUserInviteResult[] }> {
    const tenant = await organizationsRepository.create({
      name: input.name,
      companyProfile: input.companyProfile,
    });

    const results: TenantUserInviteResult[] = [];

    for (const invitee of input.users) {
      try {
        const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(invitee.email, {
          redirectTo: env.WEB_APP_URL,
        });
        if (error || !invited.user) {
          throw new Error(error?.message ?? "Failed to invite via Supabase Auth");
        }

        const { error: insertError } = await supabaseAdmin.from("users").insert({
          id: invited.user.id,
          organization_id: tenant.id,
          email: invitee.email,
          full_name: invitee.fullName,
          role: invitee.role,
        });
        if (insertError) throw new Error(insertError.message);

        results.push({ email: invitee.email, fullName: invitee.fullName, role: invitee.role, status: "invited" });
      } catch (err) {
        logger.warn({ err, email: invitee.email, tenantId: tenant.id }, "Failed to invite tenant user");
        results.push({
          email: invitee.email,
          fullName: invitee.fullName,
          role: invitee.role,
          status: "failed",
          error: err instanceof Error ? err.message : "Invite failed",
        });
      }
    }

    if (!results.some((r) => r.status === "invited")) {
      // Don't leave an orphaned, admin-less organization behind.
      await organizationsRepository.update(tenant.id, { isActive: false }).catch((err) => {
        logger.warn({ err, tenantId: tenant.id }, "Failed to deactivate tenant after all user invites failed");
      });
      throw ApiError.conflict("Failed to invite any users for this tenant. Check the email addresses and try again.");
    }

    await auditLogsRepository.record({
      organizationId: tenant.id,
      userId: actingUserId,
      action: "create_tenant",
      resourceType: "organization",
      resourceId: tenant.id,
      afterState: { name: input.name, users: results },
    });

    return { tenant, users: results };
  },

  async update(tenantId: string, input: UpdateTenantInput, actingUserId: string): Promise<Organization> {
    const existing = await organizationsRepository.findById(tenantId);
    if (!existing) throw ApiError.notFound("Tenant not found");

    const updated = await organizationsRepository.update(tenantId, {
      name: input.name,
      companyProfile: input.companyProfile,
      isActive: input.isActive,
    });

    await auditLogsRepository.record({
      organizationId: tenantId,
      userId: actingUserId,
      action: "update_tenant",
      resourceType: "organization",
      resourceId: tenantId,
      beforeState: { name: existing.name, isActive: existing.isActive },
      afterState: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  },

  async listUsers(tenantId: string): Promise<User[]> {
    const tenant = await organizationsRepository.findById(tenantId);
    if (!tenant) throw ApiError.notFound("Tenant not found");
    return usersRepository.list(tenantId);
  },
};
