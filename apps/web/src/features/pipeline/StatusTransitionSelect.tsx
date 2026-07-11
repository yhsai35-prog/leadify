import { PIPELINE_TRANSITIONS, type PipelineStatus } from "@bluwheelz/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { titleCase } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useUpdateLeadStatus } from "./usePipeline";

export function StatusTransitionSelect({ leadId, currentStatus }: { leadId: string; currentStatus: PipelineStatus }) {
  const updateStatus = useUpdateLeadStatus(leadId);
  const { toast } = useToast();
  const options = PIPELINE_TRANSITIONS[currentStatus].filter((s) => s !== "sent");

  if (options.length === 0) {
    return <span className="text-sm text-muted-foreground">{titleCase(currentStatus)} (final stage)</span>;
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={(value) =>
        updateStatus.mutate(value as PipelineStatus, {
          onError: (err) => toast({ title: "Could not update status", description: err.message, variant: "error" }),
        })
      }
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={currentStatus}>{titleCase(currentStatus)} (current)</SelectItem>
        {options.map((status) => (
          <SelectItem key={status} value={status}>
            Move to {titleCase(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
