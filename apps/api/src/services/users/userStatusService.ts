import type { User } from "@bluwheelz/shared";
import { UserRole } from "@bluwheelz/shared";
import { usersRepository } from "../../repositories/usersRepository.js";
import { auditLogsRepository } from "../../repositories/auditLogsRepository.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { ApiError } from "../../utils/errors.js";

/**
 * Reversible enable/disable for a user account. Disabling both flips
 * `users.is_active` (blocks API access via requireAuth) and bans the Supabase
 * Auth user (blocks login/token refresh). Enabling reverses both.
 *
 * Used by tenant admins (own org only, enforced by the caller) and by the
 * platform super admin (any org).
 */
export async function setUserStatus(
  target: User,
  isActive: boolean,
  actingUser: { id: string; organizationId: string },
): Promise<User> {
  if (target.id === actingUser.id) {
    throw ApiError.forbidden("You cannot change the status of your own account.");
  }

  if (
    !isActive &&
    target.role === UserRole.SUPER_ADMIN &&
    (await usersRepository.countActiveSuperAdmins(target.organizationId)) <= 1
  ) {
    throw ApiError.conflict("Cannot disable the last active super admin.");
  }

  const updated = await usersRepository.setActive(target.id, isActive);

  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
    // "none" lifts an existing ban; 100 years is effectively permanent.
    ban_duration: isActive ? "none" : "876000h",
  });
  if (banError) throw ApiError.internal(banError.message);

  await auditLogsRepository.record({
    organizationId: target.organizationId,
    userId: actingUser.id,
    action: isActive ? "enable_user" : "disable_user",
    resourceType: "user",
    resourceId: target.id,
    afterState: { email: target.email, isActive },
  });

  return updated;
}
