import {
  CampaignChannel,
  CampaignFlowNodeType,
  type CampaignFlowDefinition,
  type CreateCampaignInput,
} from "@bluwheelz/shared";

function linearFlow(
  channel: CampaignChannel,
  extras?: { templateName?: string; templateLanguage?: string; tone?: "professional" | "casual" | "direct" },
): CampaignFlowDefinition {
  const nodes = [
    {
      id: "audience",
      type: CampaignFlowNodeType.AUDIENCE,
      position: { x: 80, y: 160 },
      data: { label: "Audience" },
    },
    {
      id: "channel",
      type: CampaignFlowNodeType.CHANNEL,
      position: { x: 280, y: 160 },
      data: { label: channel === "whatsapp" ? "WhatsApp" : "Email", channel },
    },
    {
      id: "message",
      type: CampaignFlowNodeType.MESSAGE,
      position: { x: 480, y: 160 },
      data: {
        label: channel === "whatsapp" ? "Template" : "Message",
        templateName: extras?.templateName,
        templateLanguage: extras?.templateLanguage ?? "en",
        tone: extras?.tone ?? "professional",
      },
    },
    {
      id: "ai",
      type: CampaignFlowNodeType.AI_PERSONALIZE,
      position: { x: 680, y: 160 },
      data: { label: "AI Personalize", tone: extras?.tone ?? "professional" },
    },
    {
      id: "approval",
      type: CampaignFlowNodeType.APPROVAL,
      position: { x: 880, y: 160 },
      data: { label: "Human Approval", locked: true },
      deletable: false,
    },
    {
      id: "send",
      type: CampaignFlowNodeType.SEND,
      position: { x: 1080, y: 160 },
      data: { label: "Send", sendMode: "immediate" as const },
    },
    {
      id: "track",
      type: CampaignFlowNodeType.TRACK_REPLIES,
      position: { x: 1280, y: 160 },
      data: { label: "Track Replies" },
    },
  ];

  const edges = [
    { id: "e1", source: "audience", target: "channel" },
    { id: "e2", source: "channel", target: "message" },
    { id: "e3", source: "message", target: "ai" },
    { id: "e4", source: "ai", target: "approval" },
    { id: "e5", source: "approval", target: "send" },
    { id: "e6", source: "send", target: "track" },
  ];

  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 0.85 } };
}

export function recommendedFlowForChannel(channel: CampaignChannel): CampaignFlowDefinition {
  return linearFlow(channel);
}

export function resolveCreateFlowDefinition(input: CreateCampaignInput): CampaignFlowDefinition {
  if (input.flowDefinition && (input.flowDefinition.nodes?.length ?? 0) > 0) {
    return input.flowDefinition;
  }
  if (input.useRecommendedFlow !== false) {
    return recommendedFlowForChannel(input.channel ?? CampaignChannel.EMAIL);
  }
  return { nodes: [], edges: [] };
}

export function extractFlowMessageConfig(flow: CampaignFlowDefinition | null | undefined): {
  tone: "professional" | "casual" | "direct";
  templateName?: string;
  templateLanguage: string;
  waitHours: number;
  sendMode: "immediate" | "schedule";
} {
  const message = flow?.nodes?.find((n) => n.type === CampaignFlowNodeType.MESSAGE);
  const ai = flow?.nodes?.find((n) => n.type === CampaignFlowNodeType.AI_PERSONALIZE);
  const wait = flow?.nodes?.find((n) => n.type === CampaignFlowNodeType.WAIT);
  const send = flow?.nodes?.find((n) => n.type === CampaignFlowNodeType.SEND);

  return {
    tone: (ai?.data?.tone ?? message?.data?.tone ?? "professional") as "professional" | "casual" | "direct",
    templateName: message?.data?.templateName,
    templateLanguage: message?.data?.templateLanguage ?? "en",
    waitHours: wait?.data?.waitHours ?? 0,
    sendMode: (send?.data?.sendMode ?? "immediate") as "immediate" | "schedule",
  };
}
