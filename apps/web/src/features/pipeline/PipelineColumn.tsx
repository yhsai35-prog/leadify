import type { Lead, PipelineStatus } from "@bluwheelz/shared";
import { titleCase } from "@/lib/utils";
import { LeadCard } from "./LeadCard";

export function PipelineColumn({ status, leads }: { status: PipelineStatus; leads: Lead[] }) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titleCase(status)}</span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium">{leads.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {leads.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No leads</p>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  );
}
