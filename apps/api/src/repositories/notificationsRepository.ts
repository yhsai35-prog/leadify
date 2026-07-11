import type { Notification } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const notificationsRepository = {
  async listForUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw ApiError.internal(error.message);
    return toCamel<Notification[]>(data ?? []);
  },

  async createForUsers(userIds: string[], type: string, payload: Record<string, unknown>): Promise<void> {
    if (userIds.length === 0) return;
    const rows = userIds.map((userId) => toSnake({ userId, type, payload }));
    const { error } = await supabaseAdmin.from("notifications").insert(rows);
    if (error) throw ApiError.internal(error.message);
  },

  async markRead(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw ApiError.internal(error.message);
  },
};
