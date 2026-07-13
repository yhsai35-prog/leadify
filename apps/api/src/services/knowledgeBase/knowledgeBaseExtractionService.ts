import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { ApiError } from "../../utils/errors.js";

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const SUPPORTED_KB_FILE_MIME_TYPES = ["application/pdf", DOCX_MIME_TYPE] as const;

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export const knowledgeBaseExtractionService = {
  /** Extracts plain text from an uploaded PDF or DOCX buffer. */
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    let text: string;
    if (mimeType === "application/pdf") {
      text = await extractFromPdf(buffer);
    } else if (mimeType === DOCX_MIME_TYPE) {
      text = await extractFromDocx(buffer);
    } else {
      throw ApiError.badRequest("Only PDF and DOCX files are supported for knowledge base uploads.");
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw ApiError.badRequest("No readable text could be extracted from this file.");
    }
    return trimmed;
  },
};
