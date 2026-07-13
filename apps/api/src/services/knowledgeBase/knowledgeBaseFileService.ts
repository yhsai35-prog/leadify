import { supabaseAdmin } from "../../config/supabase.js";
import { ApiError } from "../../utils/errors.js";
import { logger } from "../../config/logger.js";
import { SUPPORTED_KB_FILE_MIME_TYPES } from "./knowledgeBaseExtractionService.js";

const BUCKET = "knowledge-base-files";
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

let bucketReady = false;

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: "15MB",
      allowedMimeTypes: [...SUPPORTED_KB_FILE_MIME_TYPES],
    });
    // Another instance may have created it between the check and now.
    if (error && !/already exists/i.test(error.message)) {
      logger.error({ error }, "Failed to create knowledge-base-files storage bucket");
      throw ApiError.internal("Knowledge base file storage is not available right now.");
    }
  }
  bucketReady = true;
}

export const knowledgeBaseFileService = {
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,

  /** Uploads the original source file so admins can reference/download it later. */
  async storeSourceFile(
    organizationId: string,
    articleId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await ensureBucket();

    if (buffer.length === 0) throw ApiError.badRequest("The uploaded file is empty.");
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw ApiError.badRequest("Knowledge base files must be smaller than 15MB.");
    }

    const path = `${organizationId}/${articleId}/${filename}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (error) throw ApiError.internal(`Knowledge base file upload failed: ${error.message}`);

    return path;
  },

  /** Short-lived signed URL so an admin can view/download the original document. */
  async getSignedUrl(storagePath: string, expiresInSeconds = 60 * 5): Promise<string> {
    await ensureBucket();
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data) throw ApiError.internal(`Failed to create a signed URL: ${error?.message ?? "unknown error"}`);
    return data.signedUrl;
  },
};
