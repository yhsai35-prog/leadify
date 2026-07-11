import type { UserSettings } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/errors.js";

export const userSettingsRepository = {
  async getByUserId(userId: string): Promise<UserSettings> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("preferred_email_client, smtp_settings")
      .eq("id", userId)
      .single();

    if (error || !data) throw ApiError.notFound("User not found");

    return {
      preferredEmailClient: (data.preferred_email_client as UserSettings["preferredEmailClient"]) ?? "none",
      smtpSettings: (data.smtp_settings as UserSettings["smtpSettings"]) ?? {},
    };
  },

  async updateByUserId(userId: string, input: Partial<UserSettings>): Promise<UserSettings> {
    const updatePayload: Record<string, unknown> = {};

    if (input.preferredEmailClient !== undefined) {
      updatePayload.preferred_email_client = input.preferredEmailClient;
    }
    if (input.smtpSettings !== undefined) {
      updatePayload.smtp_settings = input.smtpSettings;
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updatePayload)
      .eq("id", userId)
      .select("preferred_email_client, smtp_settings")
      .single();

    if (error || !data) throw ApiError.internal(error?.message ?? "Failed to update user settings");

    return {
      preferredEmailClient: (data.preferred_email_client as UserSettings["preferredEmailClient"]) ?? "none",
      smtpSettings: (data.smtp_settings as UserSettings["smtpSettings"]) ?? {},
    };
  },
};
