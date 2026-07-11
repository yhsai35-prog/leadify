import { z } from "zod";

export const copilotChatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
});
export type CopilotChatInput = z.infer<typeof copilotChatSchema>;

export const copilotRoleSchema = z.enum(["user", "assistant", "tool"]);

export const copilotNotificationSchema = z.object({
  variant: z.enum(["info", "error", "success"]),
  title: z.string(),
  description: z.string().optional(),
});
export type CopilotNotification = z.infer<typeof copilotNotificationSchema>;

export const copilotMessageSchema = z.object({
  role: copilotRoleSchema,
  content: z.string(),
  toolName: z.string().optional(),
  toolInput: z.record(z.unknown()).optional(),
  notification: copilotNotificationSchema.optional(),
});
export type CopilotMessage = z.infer<typeof copilotMessageSchema>;
