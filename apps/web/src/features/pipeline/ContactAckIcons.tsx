import { Linkedin, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcknowledgeOutreach, useLeadAcknowledgements } from "./useAcknowledgements";

/**
 * Compact per-contact "I sent the email / LinkedIn message" toggles.
 * Purely a self-reported nurturing signal -- independent of the real
 * send-approval pipeline and does not affect pipelineStatus.
 */
export function ContactAckIcons({
  leadId,
  contactId,
  size = "sm",
}: {
  leadId: string;
  contactId: string;
  size?: "sm" | "md";
}) {
  const { data: acknowledgements } = useLeadAcknowledgements(leadId);
  const acknowledge = useAcknowledgeOutreach(leadId);

  const emailAck = acknowledgements?.find((a) => a.contactId === contactId && a.channel === "email")?.acknowledged ?? false;
  const linkedinAck =
    acknowledgements?.find((a) => a.contactId === contactId && a.channel === "linkedin")?.acknowledged ?? false;

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  const toggle = (channel: "email" | "linkedin", current: boolean) => (e: React.MouseEvent) => {
    e.stopPropagation();
    acknowledge.mutate({ contactId, channel, acknowledged: !current });
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title={emailAck ? "Email marked as sent to this POC" : "Mark email as sent to this POC"}
        onClick={toggle("email", emailAck)}
        disabled={acknowledge.isPending}
        className={cn(
          "flex items-center justify-center rounded-md border transition-colors",
          btnSize,
          emailAck
            ? "border-success/30 bg-success/15 text-success"
            : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
        )}
      >
        <Mail className={iconSize} />
      </button>
      <button
        type="button"
        title={linkedinAck ? "LinkedIn message marked as sent to this POC" : "Mark LinkedIn message as sent to this POC"}
        onClick={toggle("linkedin", linkedinAck)}
        disabled={acknowledge.isPending}
        className={cn(
          "flex items-center justify-center rounded-md border transition-colors",
          btnSize,
          linkedinAck
            ? "border-success/30 bg-success/15 text-success"
            : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
        )}
      >
        <Linkedin className={iconSize} />
      </button>
    </div>
  );
}
