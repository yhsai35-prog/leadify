import type { PipelineStatus } from "@bluwheelz/shared";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

const PIPELINE_STATUS_VARIANT: Record<
  PipelineStatus,
  "outline" | "warning" | "success" | "destructive" | "secondary" | "info"
> = {
  imported: "info",
  qualified: "secondary",
  research_complete: "secondary",
  draft_ready: "outline",
  pending_approval: "warning",
  approved: "success",
  sent: "success",
  interested: "success",
  meeting: "success",
  proposal: "success",
  won: "success",
  lost: "destructive",
};

export function PipelineStatusBadge({ status }: { status: PipelineStatus }) {
  return <Badge variant={PIPELINE_STATUS_VARIANT[status]}>{titleCase(status)}</Badge>;
}
