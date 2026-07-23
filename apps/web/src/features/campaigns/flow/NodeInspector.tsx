import { CampaignChannel, CampaignFlowNodeType } from "@bluwheelz/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { CampaignFlowNodeData } from "./nodeTypes";

interface WhatsappTemplateOption {
  name: string;
  language: string;
  status: string;
}

interface NodeInspectorProps {
  nodeId: string | null;
  nodeType: string | null;
  data: CampaignFlowNodeData | null;
  channel: CampaignChannel;
  templates: WhatsappTemplateOption[];
  onChange: (nodeId: string, patch: Partial<CampaignFlowNodeData>) => void;
  onSyncTemplates?: () => void;
  syncingTemplates?: boolean;
}

export function NodeInspector({
  nodeId,
  nodeType,
  data,
  channel,
  templates,
  onChange,
  onSyncTemplates,
  syncingTemplates,
}: NodeInspectorProps) {
  if (!nodeId || !nodeType || !data) {
    return (
      <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-card/60 p-4">
        <p className="text-sm text-muted-foreground">Select a node to configure it.</p>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 border-l border-border bg-card/60 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspector</p>
        <h3 className="mt-1 text-sm font-semibold">{data.label ?? nodeType}</h3>
      </div>

      <div className="space-y-1.5">
        <Label>Label</Label>
        <Input
          value={data.label ?? ""}
          onChange={(e) => onChange(nodeId, { label: e.target.value })}
        />
      </div>

      {nodeType === CampaignFlowNodeType.CHANNEL && (
        <div className="space-y-1.5">
          <Label>Channel</Label>
          <Select
            value={data.channel ?? channel}
            onValueChange={(v) => onChange(nodeId, { channel: v as CampaignChannel, label: v === "whatsapp" ? "WhatsApp" : "Email" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(nodeType === CampaignFlowNodeType.MESSAGE || nodeType === CampaignFlowNodeType.AI_PERSONALIZE) && (
        <div className="space-y-1.5">
          <Label>Tone</Label>
          <Select
            value={data.tone ?? "professional"}
            onValueChange={(v) => onChange(nodeId, { tone: v as "professional" | "casual" | "direct" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {nodeType === CampaignFlowNodeType.MESSAGE && channel === CampaignChannel.WHATSAPP && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Template</Label>
            {onSyncTemplates && (
              <Button type="button" variant="ghost" size="sm" disabled={syncingTemplates} onClick={onSyncTemplates}>
                Sync
              </Button>
            )}
          </div>
          <Select
            value={
              data.templateName
                ? `${data.templateName}::${data.templateLanguage ?? "en"}`
                : undefined
            }
            onValueChange={(v) => {
              const [name, language] = v.split("::");
              onChange(nodeId, { templateName: name, templateLanguage: language, label: name });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select approved template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={`${t.name}-${t.language}`} value={`${t.name}::${t.language}`}>
                  {t.name} ({t.language})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {nodeType === CampaignFlowNodeType.WAIT && (
        <div className="space-y-1.5">
          <Label>Wait hours</Label>
          <Input
            type="number"
            min={0}
            value={data.waitHours ?? 0}
            onChange={(e) => onChange(nodeId, { waitHours: Number(e.target.value) || 0 })}
          />
        </div>
      )}

      {nodeType === CampaignFlowNodeType.SEND && (
        <div className="space-y-1.5">
          <Label>Send mode</Label>
          <Select
            value={data.sendMode ?? "immediate"}
            onValueChange={(v) => onChange(nodeId, { sendMode: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate after approval</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {nodeType === CampaignFlowNodeType.APPROVAL && (
        <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200">
          This gate is required. Nothing sends without human approval.
        </p>
      )}
    </aside>
  );
}
