import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, titleCase } from "@/lib/utils";
import type { WhatsappMessage, WhatsappMessageEvent } from "@bluwheelz/shared";
import { useCampaignConversation } from "./useCampaigns";

const DELIVERY_VARIANT: Record<string, "outline" | "secondary" | "success" | "warning" | "destructive"> = {
  pending: "outline",
  accepted: "secondary",
  sent: "secondary",
  delivered: "success",
  read: "success",
  failed: "destructive",
  reply: "warning",
};

interface ConversationHistoryPanelProps {
  campaignId: string;
}

export function ConversationHistoryPanel({ campaignId }: ConversationHistoryPanelProps) {
  const { data, isLoading } = useCampaignConversation(campaignId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading conversation history…</p>;
  }

  const messages = data?.messages ?? [];
  const events = data?.events ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messages</CardTitle>
          <p className="text-sm text-muted-foreground">
            What was drafted/sent and the latest delivery status from Meta.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WhatsApp messages yet for this campaign.</p>
          ) : (
            messages.map((m: WhatsappMessage) => (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{m.templateName}</Badge>
                  <Badge variant={DELIVERY_VARIANT[m.deliveryStatus] ?? "outline"}>
                    {titleCase(m.deliveryStatus || m.status)}
                  </Badge>
                  <Badge variant="outline">{titleCase(m.status)}</Badge>
                  {m.toPhone && <span className="font-mono text-xs text-muted-foreground">{m.toPhone}</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{m.bodyPreview || "—"}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Created {formatDateTime(m.createdAt)}
                  {m.sentAt ? ` · Sent ${formatDateTime(m.sentAt)}` : ""}
                  {m.deliveredAt ? ` · Delivered ${formatDateTime(m.deliveredAt)}` : ""}
                  {m.readAt ? ` · Read ${formatDateTime(m.readAt)}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Accepted → sent → delivered → read, plus inbound replies.
          </p>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivery events yet. Send a message and keep the webhook connected.</p>
          ) : (
            <ol className="space-y-3">
              {events.map((e: WhatsappMessageEvent) => (
                <li key={e.id} className="flex gap-3 border-l-2 border-border pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={DELIVERY_VARIANT[e.eventType] ?? "outline"}>{titleCase(e.eventType)}</Badge>
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(e.occurredAt)}</span>
                    </div>
                    {e.bodyText && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{e.bodyText}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
