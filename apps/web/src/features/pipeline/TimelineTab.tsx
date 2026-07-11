import { Clock, Mail } from "lucide-react";
import { formatDateTime, titleCase } from "@/lib/utils";
import { useLeadActivities } from "./usePipeline";

function SentActivityDetails({ payload }: { payload: Record<string, unknown> }) {
  const contactName = typeof payload.contactName === "string" ? payload.contactName : null;
  const companyName = typeof payload.companyName === "string" ? payload.companyName : null;
  const subject = typeof payload.subject === "string" ? payload.subject : null;
  const bodyText = typeof payload.bodyText === "string" ? payload.bodyText : null;
  const sentAt = typeof payload.sentAt === "string" ? payload.sentAt : null;

  if (!contactName && !subject && !bodyText) return null;

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3">
      {(contactName || companyName) && (
        <p className="text-xs text-muted-foreground">
          Sent to {contactName ?? "POC"}
          {companyName ? ` at ${companyName}` : ""}
          {sentAt ? ` · ${formatDateTime(sentAt)}` : ""}
        </p>
      )}
      {subject && (
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          {subject}
        </p>
      )}
      {bodyText && <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">{bodyText}</div>}
    </div>
  );
}

export function TimelineTab({ leadId }: { leadId: string }) {
  const { data: activities, isLoading } = useLeadActivities(leadId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading timeline...</p>;
  if (!activities || activities.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{titleCase(activity.type)}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</p>
            {activity.type === "sent" && <SentActivityDetails payload={activity.payload ?? {}} />}
          </div>
        </div>
      ))}
    </div>
  );
}
