import { useState } from "react";
import type { ApprovalQueueItem } from "@bluwheelz/shared";
import { Check, X, Pencil, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { useApproveEmail, useEditAndApprove, useRejectEmail, type ApprovalDecisionResult } from "./useApproval";

function approvalToast(result: ApprovalDecisionResult) {
  if (result.notice) {
    return { title: "Outreach approved", description: result.notice, variant: "info" as const };
  }
  if (result.sendQueued) {
    return { title: "Approved and queued for sending", variant: "success" as const };
  }
  return { title: "Outreach approved", variant: "success" as const };
}

export function ApprovalCard({ item }: { item: ApprovalQueueItem }) {
  const approve = useApproveEmail();
  const reject = useRejectEmail();
  const editApprove = useEditAndApprove();
  const { toast } = useToast();

  const isWhatsapp = Boolean(item.whatsappMessageId);
  const email = item.email;
  const wa = item.whatsappMessage;
  const company = item.lead?.company;
  const contact = email?.contact ?? wa?.contact ?? item.lead?.contact;
  const contactEmail = contact?.email;
  const contactPhone = contact?.phone;
  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim()
    : "";

  const [isEditing, setIsEditing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editedBody, setEditedBody] = useState(isWhatsapp ? (wa?.bodyPreview ?? "") : (email?.bodyText ?? ""));

  const canApprove = isWhatsapp ? Boolean(contactPhone) : Boolean(contactEmail);
  const title = isWhatsapp
    ? `WhatsApp · ${wa?.templateName ?? "template"}`
    : email?.subject ?? "Outreach draft";

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary">{isWhatsapp ? "WhatsApp" : "Email"}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {contactName || "Unknown POC"}
            {contact?.title ? ` — ${contact.title}` : ""} &middot; {company?.name ?? "Unknown company"} &middot;
            submitted {formatDateTime(item.createdAt)}
          </p>
          {isWhatsapp
            ? contactPhone && <p className="mt-1 text-xs text-muted-foreground">{contactPhone}</p>
            : contactEmail && <p className="mt-1 text-xs text-muted-foreground">{contactEmail}</p>}
        </div>
        <Badge variant="warning">Pending Approval</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <Textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} rows={8} />
        ) : (
          <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
            {isWhatsapp ? wa?.bodyPreview : email?.bodyText}
          </div>
        )}

        {isRejecting && (
          <Textarea
            placeholder="Why is this being rejected? (required, visible to the submitter)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
          />
        )}

        {!canApprove && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {isWhatsapp
              ? "This contact has no phone number yet. Add a phone on the lead page before approving."
              : "This contact has no email address yet. Reveal or add an email on the lead page before approving."}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!isEditing && !isRejecting && (
            <>
              <Button
                size="sm"
                variant="success"
                className="gap-2"
                disabled={approve.isPending || !canApprove}
                onClick={() =>
                  approve.mutate(item.id, {
                    onSuccess: (result) => toast(approvalToast(result)),
                    onError: (err) => toast({ title: "Approval failed", description: err.message, variant: "error" }),
                  })
                }
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="gap-2" disabled>
                <RefreshCcw className="h-4 w-4" /> Regenerate
              </Button>
              <Button size="sm" variant="destructive" className="gap-2" onClick={() => setIsRejecting(true)}>
                <X className="h-4 w-4" /> Reject
              </Button>
            </>
          )}

          {isEditing && (
            <>
              <Button
                size="sm"
                variant="success"
                disabled={editApprove.isPending || !canApprove}
                onClick={() =>
                  editApprove.mutate(
                    {
                      id: item.id,
                      editedContent: isWhatsapp ? { bodyPreview: editedBody } : { bodyText: editedBody },
                    },
                    {
                      onSuccess: (result) => {
                        setIsEditing(false);
                        toast(approvalToast(result));
                      },
                      onError: (err) =>
                        toast({ title: "Edit-approve failed", description: err.message, variant: "error" }),
                    },
                  )
                }
              >
                Save & Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          )}

          {isRejecting && (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={() =>
                  reject.mutate(
                    { id: item.id, reviewerNotes: rejectReason },
                    {
                      onSuccess: () => toast({ title: "Outreach rejected", variant: "info" }),
                      onError: (err) =>
                        toast({ title: "Reject failed", description: err.message, variant: "error" }),
                    },
                  )
                }
              >
                Confirm reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsRejecting(false)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
