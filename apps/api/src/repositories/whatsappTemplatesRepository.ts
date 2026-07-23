import type { WhatsappTemplate } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const whatsappTemplatesRepository = {
  async listByOrganization(organizationId: string): Promise<WhatsappTemplate[]> {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappTemplate[]>(data ?? []);
  },

  async findByNameLanguage(
    organizationId: string,
    name: string,
    language: string,
  ): Promise<WhatsappTemplate | null> {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("name", name)
      .eq("language", language)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<WhatsappTemplate>(data) : null;
  },

  async upsertMany(
    organizationId: string,
    templates: Array<{
      metaId?: string | null;
      name: string;
      language: string;
      status: string;
      category?: string | null;
      components: unknown[];
    }>,
  ): Promise<WhatsappTemplate[]> {
    if (templates.length === 0) return [];
    const syncedAt = new Date().toISOString();
    const rows = templates.map((t) =>
      toSnake({
        organizationId,
        metaId: t.metaId ?? null,
        name: t.name,
        language: t.language,
        status: t.status,
        category: t.category ?? null,
        components: t.components,
        syncedAt,
        updatedAt: syncedAt,
      }),
    );
    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .upsert(rows, { onConflict: "organization_id,name,language" })
      .select("*");
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappTemplate[]>(data ?? []);
  },
};
