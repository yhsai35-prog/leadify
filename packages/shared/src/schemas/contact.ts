import { z } from "zod";
import { uuidSchema } from "./common.js";

export const createContactSchema = z.object({
  companyId: uuidSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  title: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(5).nullable().optional(),
  title: z.string().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const contactIdParamSchema = z.object({ id: uuidSchema });
