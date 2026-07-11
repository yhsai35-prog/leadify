import { useState } from "react";
import type { ApprovalQueueItem } from "@bluwheelz/shared";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { useConfirmEmailSent } from "./useApproval";

function pocLabel(item: ApprovalQueueItem): string {
  const contact = item.email?.contact ?? item.lead?.contact;
  if (!contact) return "Unknown POC";
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  return name || contact.email || "Unknown POC";
}

function pocEmail(item: ApprovalQueueItem): string | null {
  return item.email?.contact?.email ?? item.lead?.contact?.email ?? null;
}

export function ReadyToSendCard({ item }: { item: ApprovalQueueItem }) {
  const confirmSent = useConfirmEmailSent();
  const { toast } = useToast();
  const [composeOpened, setComposeOpened] = useState(false);

  const email = item.email;
  const companyName = item.lead?.company?.name ?? "Unknown company";
  const contact = item.email?.contact ?? item.lead?.contact;
  const to = pocEmail(item);

  function openGmailCompose() {
    if (!email || !to) return;
    const subject = encodeURIComponent(email.subject);
    const body = encodeURIComponent(email.bodyText);
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${subject}&body=${body}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setComposeOpened(true);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{email?.subject}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {pocLabel(item)}
            {contact?.title ? ` — ${contact.title}` : ""} &middot; {companyName}
            {item.decidedAt ? ` · approved ${formatDateTime(item.decidedAt)}` : ""}
          </p>
          {to && <p className="mt-1 text-xs text-muted-foreground">{to}</p>}
        </div>
        <Badge variant="success">Ready to send</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{email?.bodyText}</div>
        {!to && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This contact has no email address. Add one on the lead page before sending.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-[#4285F4] text-[#4285F4] hover:bg-[#4285F4]/10"
            disabled={!to || !email}
            onClick={openGmailCompose}
          >
            <ExternalLink className="h-4 w-4" />
            Send with Gmail
          </Button>
          <Button
            size="sm"
            className="gap-2"
            disabled={!composeOpened || confirmSent.isPending || !email}
            onClick={() =>
              confirmSent.mutate(email!.id, {
                onSuccess: () => toast({ title: "Marked as sent", variant: "success" }),
                onError: (err) => toast({ title: "Could not mark as sent", description: err.message, variant: "error" }),
              })
            }
          >
            <CheckCircle2 className="h-4 w-4" />
            {confirmSent.isPending ? "Saving..." : "Mark as sent"}
          </Button>
        </div>
        {!composeOpened && (
          <p className="text-[11px] text-muted-foreground">
            Open Gmail first, send the message, then click Mark as sent to update the pipeline timeline.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
