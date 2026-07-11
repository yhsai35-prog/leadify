import { z } from "zod";

export const preferredEmailClientSchema = z.enum(["gmail", "smtp", "none"]);
export type PreferredEmailClient = z.infer<typeof preferredEmailClientSchema>;

export const smtpSettingsSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  email: z.string().email().optional(),
  password: z.string().optional(),
});
export type SmtpSettings = z.infer<typeof smtpSettingsSchema>;

export const updateUserSettingsSchema = z.object({
  preferredEmailClient: preferredEmailClientSchema.optional(),
  smtpSettings: smtpSettingsSchema.optional(),
});
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

export interface UserSettings {
  preferredEmailClient: PreferredEmailClient;
  smtpSettings: SmtpSettings;
}
