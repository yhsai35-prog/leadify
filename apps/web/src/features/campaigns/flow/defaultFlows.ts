import {
  CampaignChannel,
  CampaignFlowNodeType,
  type CampaignFlowDefinition,
} from "@bluwheelz/shared";

export function buildRecommendedFlow(channel: CampaignChannel): CampaignFlowDefinition {
  const channelLabel = channel === CampaignChannel.WHATSAPP ? "WhatsApp" : "Email";
  return {
    nodes: [
      { id: "audience", type: CampaignFlowNodeType.AUDIENCE, position: { x: 60, y: 140 }, data: { label: "Audience" } },
      {
        id: "channel",
        type: CampaignFlowNodeType.CHANNEL,
        position: { x: 260, y: 140 },
        data: { label: channelLabel, channel },
      },
      {
        id: "message",
        type: CampaignFlowNodeType.MESSAGE,
        position: { x: 460, y: 140 },
        data: {
          label: channel === CampaignChannel.WHATSAPP ? "Template" : "Message",
          tone: "professional",
          templateLanguage: "en",
        },
      },
      {
        id: "ai",
        type: CampaignFlowNodeType.AI_PERSONALIZE,
        position: { x: 660, y: 140 },
        data: { label: "AI Personalize", tone: "professional" },
      },
      {
        id: "approval",
        type: CampaignFlowNodeType.APPROVAL,
        position: { x: 860, y: 140 },
        data: { label: "Human Approval", locked: true },
        deletable: false,
      },
      {
        id: "send",
        type: CampaignFlowNodeType.SEND,
        position: { x: 1060, y: 140 },
        data: { label: "Send", sendMode: "immediate" },
      },
      {
        id: "track",
        type: CampaignFlowNodeType.TRACK_REPLIES,
        position: { x: 1260, y: 140 },
        data: { label: "Track Replies" },
      },
    ],
    edges: [
      { id: "e1", source: "audience", target: "channel" },
      { id: "e2", source: "channel", target: "message" },
      { id: "e3", source: "message", target: "ai" },
      { id: "e4", source: "ai", target: "approval" },
      { id: "e5", source: "approval", target: "send" },
      { id: "e6", source: "send", target: "track" },
    ],
    viewport: { x: 0, y: 40, zoom: 0.9 },
  };
}

export const FLOW_PALETTE: Array<{
  type: (typeof CampaignFlowNodeType)[keyof typeof CampaignFlowNodeType];
  label: string;
  description: string;
}> = [
  { type: CampaignFlowNodeType.AUDIENCE, label: "Audience", description: "Campaign leads" },
  { type: CampaignFlowNodeType.CHANNEL, label: "Channel", description: "Email or WhatsApp" },
  { type: CampaignFlowNodeType.MESSAGE, label: "Message", description: "Template / tone" },
  { type: CampaignFlowNodeType.AI_PERSONALIZE, label: "AI Personalize", description: "Fill variables" },
  { type: CampaignFlowNodeType.APPROVAL, label: "Human Approval", description: "Required gate" },
  { type: CampaignFlowNodeType.WAIT, label: "Wait", description: "Delay before send" },
  { type: CampaignFlowNodeType.SEND, label: "Send", description: "Dispatch messages" },
  { type: CampaignFlowNodeType.TRACK_REPLIES, label: "Track Replies", description: "Inbound tracking" },
];
