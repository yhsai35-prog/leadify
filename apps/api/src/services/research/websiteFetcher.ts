import { logger } from "../../config/logger.js";

const MAX_CHARS = 8000;

/**
 * Fetches a company's homepage and strips markup down to plain text for the
 * research prompt. Deliberately minimal (no headless browser, no JS
 * rendering) -- most corporate marketing sites render enough static content
 * server-side for a useful summary, and adding Puppeteer/Playwright is a
 * meaningful infra cost not justified for MVP.
 */
export async function fetchWebsiteText(domain: string | null): Promise<string> {
  if (!domain) return "";
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "LeadifySalesIntelligenceBot/1.0" },
    });
    if (!response.ok) return "";
    const html = await response.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, MAX_CHARS);
  } catch (err) {
    logger.warn({ domain, err }, "Failed to fetch website text for research");
    return "";
  }
}
