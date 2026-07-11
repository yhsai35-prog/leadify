import type { ReplySentiment } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export interface EmailReplyInput {
  emailId: string;
  fromEmail: string;
  bodySnippet: string;
  sentiment?: ReplySentiment;
  suggestedAction?: string;
  receivedAt: string;
}

export const emailRepliesRepository = {
  async create(input: EmailReplyInput): Promise<void> {
    const row = toSnake(input);
    const { error } = await supabaseAdmin.from("email_replies").insert(row);
    if (error) throw ApiError.internal(error.message);
  },
};
