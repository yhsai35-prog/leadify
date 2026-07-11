import { supabaseAdmin } from "../../config/supabase.js";
import { organizationsRepository } from "../../repositories/organizationsRepository.js";
import { ApiError } from "../../utils/errors.js";
import { logger } from "../../config/logger.js";

const BUCKET = "org-logos";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

let bucketReady = false;

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: "2MB",
      allowedMimeTypes: Object.keys(EXTENSIONS),
    });
    // Another instance may have created it between the check and now.
    if (error && !/already exists/i.test(error.message)) {
      logger.error({ error }, "Failed to create org-logos storage bucket");
      throw ApiError.internal("Logo storage is not available right now.");
    }
  }
  bucketReady = true;
}

export const logoService = {
  async uploadLogo(organizationId: string, fileBase64: string, contentType: string): Promise<string> {
    await ensureBucket();

    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length === 0) throw ApiError.badRequest("The uploaded logo file is empty.");
    if (buffer.length > 2 * 1024 * 1024) throw ApiError.badRequest("Logo must be smaller than 2MB.");

    const path = `${organizationId}/logo.${EXTENSIONS[contentType] ?? "png"}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (error) throw ApiError.internal(`Logo upload failed: ${error.message}`);

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    // Cache-bust so a replaced logo shows up immediately in the app.
    const logoUrl = `${data.publicUrl}?v=${Date.now()}`;
    await organizationsRepository.update(organizationId, { logoUrl });
    return logoUrl;
  },

  async removeLogo(organizationId: string): Promise<void> {
    await organizationsRepository.update(organizationId, { logoUrl: null });
  },
};
