import type { CreateTenantInput, Organization, TenantSummary, UpdateTenantInput, User } from "@bluwheelz/shared";
import { UserRole } from "@bluwheelz/shared";
import { organizationsRepository } from "../../repositories/organizationsRepository.js";
import { usersRepository } from "../../repositories/usersRepository.js";
import { auditLogsRepository } from "../../repositories/auditLogsRepository.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { env } from "../../config/env.js";
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
   * Creates the organization and invites its first admin in one step, so a
   * tenant is never left without someone who can manage it.
   */
  async create(input: CreateTenantInput, actingUserId: string): Promise<{ tenant: Organization; adminUserId: string }> {
    const tenant = await organizationsRepository.create({
      name: input.name,
      companyProfile: input.companyProfile,
    });

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.adminEmail, {
      redirectTo: env.WEB_APP_URL,
    });
    if (error || !invited.user) {
      throw ApiError.conflict(error?.message ?? "Failed to invite the tenant admin via Supabase Auth");
    }

    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: invited.user.id,
      organization_id: tenant.id,
      email: input.adminEmail,
      full_name: input.adminFullName,
      role: UserRole.ADMIN,
    });
    if (insertError) throw ApiError.conflict(insertError.message);

    await auditLogsRepository.record({
      organizationId: tenant.id,
      userId: actingUserId,
      action: "create_tenant",
      resourceType: "organization",
      resourceId: tenant.id,
      afterState: { name: input.name, adminEmail: input.adminEmail },
    });

    return { tenant, adminUserId: invited.user.id };
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
