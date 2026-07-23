import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Bot,
  Clock,
  Inbox,
  MessageSquare,
  Radio,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { CampaignFlowNodeType } from "@bluwheelz/shared";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Users> = {
  [CampaignFlowNodeType.AUDIENCE]: Users,
  [CampaignFlowNodeType.CHANNEL]: Radio,
  [CampaignFlowNodeType.MESSAGE]: MessageSquare,
  [CampaignFlowNodeType.AI_PERSONALIZE]: Bot,
  [CampaignFlowNodeType.APPROVAL]: ShieldCheck,
  [CampaignFlowNodeType.WAIT]: Clock,
  [CampaignFlowNodeType.SEND]: Send,
  [CampaignFlowNodeType.TRACK_REPLIES]: Inbox,
};

export type FlowStage = "idle" | "active" | "done";

export type CampaignFlowNodeData = {
  label?: string;
  locked?: boolean;
  channel?: string;
  tone?: string;
  templateName?: string;
  templateLanguage?: string;
  waitHours?: number;
  sendMode?: string;
  stage?: FlowStage;
  stageCount?: number;
};

function CampaignFlowNodeComponent({ data, type, selected }: NodeProps) {
  const nodeData = data as CampaignFlowNodeData;
  const Icon = ICONS[type ?? ""] ?? MessageSquare;
  const stage = nodeData.stage ?? "idle";
  const locked = Boolean(nodeData.locked) || type === CampaignFlowNodeType.APPROVAL;

  return (
    <div
      className={cn(
        "min-w-[160px] rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-all duration-300",
        selected && "ring-2 ring-primary/40",
        stage === "active" && "border-primary/60 shadow-md",
        stage === "done" && "border-emerald-500/50 bg-emerald-500/5",
        locked && "border-amber-500/40",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-muted-foreground" />
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground",
            stage === "active" && "bg-primary text-primary-foreground",
            stage === "done" && "bg-emerald-600 text-white",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{nodeData.label ?? type}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {locked ? "Required" : type?.replace(/_/g, " ")}
            {typeof nodeData.stageCount === "number" && nodeData.stageCount > 0
              ? ` · ${nodeData.stageCount}`
              : ""}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-muted-foreground" />
    </div>
  );
}

export const campaignFlowNodeTypes = {
  [CampaignFlowNodeType.AUDIENCE]: memo(CampaignFlowNodeComponent),
  [CampaignFlowNodeType.CHANNEL]: memo(CampaignFlowNodeComponent),
  [CampaignFlowNodeType.MESSAGE]: memo(CampaignFlowNodeComponent),
  [CampaignFlowNodeType.AI_PERSONALIZE]: memo(CampaignFlowNodeComponent),
  [CampaignFlowNodeType.APPROVAL]: memo(CampaignFlowNodeComponent),
  [CampaignFlowNodeType.WAIT]: memo(CampaignFlowNodeComponent),
  [CampaignFlowNodeType.SEND]: memo(CampaignFlowNodeComponent),
  [CampaignFlowNodeType.TRACK_REPLIES]: memo(CampaignFlowNodeComponent),
};
