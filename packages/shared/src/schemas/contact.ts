import { z } from "zod";
import { uuidSchema } from "./common.js";

export const createContactSchema = z.object({
  companyId: uuidSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  title: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const contactIdParamSchema = z.object({ id: uuidSchema });
