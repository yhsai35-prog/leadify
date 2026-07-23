import { z } from "zod";
import { CampaignChannel } from "../enums/index.js";

export const CampaignFlowNodeType = {
  AUDIENCE: "audience",
  CHANNEL: "channel",
  MESSAGE: "message",
  AI_PERSONALIZE: "ai_personalize",
  APPROVAL: "approval",
  WAIT: "wait",
  SEND: "send",
  TRACK_REPLIES: "track_replies",
} as const;
export type CampaignFlowNodeType = (typeof CampaignFlowNodeType)[keyof typeof CampaignFlowNodeType];

export const campaignFlowNodeTypeSchema = z.nativeEnum(CampaignFlowNodeType);

export const campaignFlowNodeDataSchema = z
  .object({
    label: z.string().optional(),
    locked: z.boolean().optional(),
    channel: z.nativeEnum(CampaignChannel).optional(),
    tone: z.enum(["professional", "casual", "direct"]).optional(),
    templateName: z.string().optional(),
    templateLanguage: z.string().optional(),
    waitHours: z.number().nonnegative().optional(),
    sendMode: z.enum(["immediate", "schedule"]).optional(),
  })
  .passthrough();

export const campaignFlowNodeSchema = z.object({
  id: z.string().min(1),
  type: campaignFlowNodeTypeSchema,
  position: z.object({ x: z.number(), y: z.number() }),
  data: campaignFlowNodeDataSchema.default({}),
  deletable: z.boolean().optional(),
  selectable: z.boolean().optional(),
});

export const campaignFlowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

export const campaignFlowDefinitionSchema = z.object({
  nodes: z.array(campaignFlowNodeSchema).default([]),
  edges: z.array(campaignFlowEdgeSchema).default([]),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
});
export type CampaignFlowDefinition = z.infer<typeof campaignFlowDefinitionSchema>;
export type CampaignFlowNode = z.infer<typeof campaignFlowNodeSchema>;
export type CampaignFlowEdge = z.infer<typeof campaignFlowEdgeSchema>;

const REQUIRED_NODE_TYPES: CampaignFlowNodeType[] = [
  CampaignFlowNodeType.AUDIENCE,
  CampaignFlowNodeType.CHANNEL,
  CampaignFlowNodeType.MESSAGE,
  CampaignFlowNodeType.AI_PERSONALIZE,
  CampaignFlowNodeType.APPROVAL,
  CampaignFlowNodeType.SEND,
];

/**
 * Validates that a campaign flow can be launched: required nodes present,
 * Approval locked in the graph, and Channel node matches campaign channel.
 */
export function validateCampaignFlowForLaunch(
  flow: CampaignFlowDefinition,
  channel: CampaignChannel,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const types = new Set(flow.nodes.map((n) => n.type));

  for (const required of REQUIRED_NODE_TYPES) {
    if (!types.has(required)) {
      errors.push(`Flow is missing required node: ${required}`);
    }
  }

  const approval = flow.nodes.find((n) => n.type === CampaignFlowNodeType.APPROVAL);
  if (!approval) {
    errors.push("Human Approval node is required and cannot be removed");
  }

  const channelNode = flow.nodes.find((n) => n.type === CampaignFlowNodeType.CHANNEL);
  if (channelNode?.data?.channel && channelNode.data.channel !== channel) {
    errors.push(`Channel node (${channelNode.data.channel}) does not match campaign channel (${channel})`);
  }

  if (flow.nodes.length > 0 && flow.edges.length === 0 && flow.nodes.length > 1) {
    errors.push("Connect the flow nodes before launching");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
