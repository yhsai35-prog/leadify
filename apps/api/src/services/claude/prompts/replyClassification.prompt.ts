export const REPLY_CLASSIFICATION_TOOL_SCHEMA = {
  type: "object",
  properties: {
    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
    suggestedAction: { type: "string", description: "One-sentence recommended next step for the sales rep" },
    summary: { type: "string", description: "One-sentence summary of what the reply said" },
  },
  required: ["sentiment", "suggestedAction", "summary"],
} as const;

const SYSTEM_PROMPT = `You classify inbound email replies to B2B sales outreach. Be conservative: only
classify as "positive" if the reply clearly expresses interest, asks for a meeting, or asks for more
information. Out-of-office replies and generic acknowledgements are "neutral". Explicit rejections or
unsubscribe requests are "negative".`;

export function buildReplyClassificationPrompt(bodySnippet: string): { system: string; userPrompt: string } {
  const userPrompt = `## Reply Body\n\n${bodySnippet}\n\nClassify this reply using the classify_reply tool.`;
  return { system: SYSTEM_PROMPT, userPrompt };
}
