import { useState } from "react";
import type { Contact, Email } from "@bluwheelz/shared";
import { Sparkles, Send, HeartHandshake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useGenerateEmail, useLeadEmails, useRevealContacts } from "@/features/pipeline/usePipeline";
import { useAcknowledgeOutreach, useLeadAcknowledgements } from "@/features/pipeline/useAcknowledgements";
import { useSubmitForApproval } from "@/features/approval/useApproval";

const STATUS_VARIANT: Record<Email["status"], "outline" | "warning" | "success" | "destructive" | "secondary"> = {
  draft: "outline",
  pending_approval: "warning",
  approved: "success",
  rejected: "destructive",
  scheduled: "secondary",
  sent: "success",
  failed: "destructive",
  superseded: "outline",
};

function EmailCard({ email, leadId }: { email: Email; leadId: string }) {
  const submit = useSubmitForApproval(leadId);
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{email.subject}</CardTitle>
        <Badge variant={STATUS_VARIANT[email.status]}>{email.status.replace("_", " ")}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs defaultValue="email">
          <TabsList>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            <TabsTrigger value="call">Call Script</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{email.bodyText}</div>
          </TabsContent>
          <TabsContent value="linkedin">
            <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{email.linkedinMessage || "Not generated"}</div>
          </TabsContent>
          <TabsContent value="call">
            <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{email.callScript || "Not generated"}</div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          {email.status === "draft" && (
            <Button
              size="sm"
              className="gap-2"
              disabled={submit.isPending}
              onClick={() =>
                submit.mutate(email.id, {
                  onSuccess: () => toast({ title: "Submitted for approval", variant: "success" }),
                  onError: (err) => toast({ title: "Submit failed", description: err.message, variant: "error" }),
                })
              }
            >
              <Send className="h-4 w-4" />
              Submit for Approval
            </Button>
          )}
          {email.status === "approved" && (
            <p className="text-[11px] text-muted-foreground">
              Approved — send from{" "}
              <a href="/approval" className="text-primary underline-offset-4 hover:underline">
                Approval Center
              </a>{" "}
              with Gmail.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OutreachAcknowledgementsCard({ leadId, contacts }: { leadId: string; contacts: Contact[] }) {
  const { data: acknowledgements } = useLeadAcknowledgements(leadId);
  const acknowledge = useAcknowledgeOutreach(leadId);

  if (contacts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartHandshake className="h-4 w-4" /> Outreach Acknowledgements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contacts.map((contact) => {
          const emailAck =
            acknowledgements?.find((a) => a.contactId === contact.id && a.channel === "email")?.acknowledged ?? false;
          const linkedinAck =
            acknowledgements?.find((a) => a.contactId === contact.id && a.channel === "linkedin")?.acknowledged ??
            false;

          return (
            <div key={contact.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">
                {contact.firstName} {contact.lastName}
                {contact.title ? <span className="ml-1 font-normal text-muted-foreground">— {contact.title}</span> : null}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    checked={emailAck}
                    disabled={acknowledge.isPending}
                    onCheckedChange={(checked) =>
                      acknowledge.mutate({ contactId: contact.id, channel: "email", acknowledged: checked })
                    }
                  />
                  I sent the email to this POC
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    checked={linkedinAck}
                    disabled={acknowledge.isPending}
                    onCheckedChange={(checked) =>
                      acknowledge.mutate({ contactId: contact.id, channel: "linkedin", acknowledged: checked })
                    }
                  />
                  I sent the LinkedIn message to this POC
                </label>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function EmailGeneratorPanel({
  leadId,
  companyId,
  contacts,
}: {
  leadId: string;
  companyId?: string;
  contacts: Contact[];
}) {
  const { data: emails, isLoading } = useLeadEmails(leadId);
  const generate = useGenerateEmail(leadId);
  const reveal = useRevealContacts(leadId, companyId);
  const { toast } = useToast();
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const selected = contacts.find((c) => c.id === contactId);
  const needsReveal = contacts.some((c) => !c.email || (c.lastName?.includes("*") ?? false));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Generate Outreach</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contact on file for this company yet. Add a decision maker before generating outreach.</p>
          ) : (
            <>
              {needsReveal && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reveal.isPending}
                  onClick={() =>
                    reveal.mutate(undefined, {
                      onSuccess: (updated) => {
                        const withEmail = updated.filter((c) => c.email).length;
                        toast({
                          title: withEmail > 0 ? "Contact details updated" : "Email unavailable",
                          description:
                            withEmail > 0
                              ? `Apollo revealed email and profile data for ${withEmail} contact${withEmail === 1 ? "" : "s"}.`
                              : "Cannot find email for the above POCs due to unavailability of their email.",
                          variant: withEmail > 0 ? "success" : "info",
                        });
                      },
                      onError: (err) =>
                        toast({ title: "Apollo reveal failed", description: err.message, variant: "error" }),
                    })
                  }
                >
                  {reveal.isPending ? "Revealing..." : "Reveal email if Available"}
                </Button>
              )}
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} {c.title ? `— ${c.title}` : ""}
                    {c.email ? ` (${c.email})` : ""}
                  </option>
                ))}
              </select>
              {selected && (
                  <div className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    <p className="font-medium">{selected.firstName} {selected.lastName}</p>
                    <p className="text-muted-foreground">{selected.title ?? "No title"}</p>
                    {selected.email ? (
                      <p className="mt-1 text-foreground">{selected.email}</p>
                    ) : (
                      <p className="mt-1 text-muted-foreground">No email on file — click Reveal email if Available</p>
                    )}
                    {selected.linkedinUrl && (
                      <a href={selected.linkedinUrl} target="_blank" rel="noreferrer" className="mt-1 block text-primary hover:underline">
                        LinkedIn profile
                      </a>
                    )}
                    {typeof selected.metadata?.phone === "string" && (
                      <p className="text-muted-foreground">{selected.metadata.phone}</p>
                    )}
                  </div>
                )}
              <Button
                disabled={generate.isPending || !contactId}
                onClick={() =>
                  generate.mutate(
                    { contactId, type: "initial", tone: "professional" },
                    { onError: (err) => toast({ title: "Generation failed", description: err.message, variant: "error" }) },
                  )
                }
              >
                {generate.isPending ? "Generating..." : "Generate Email Package"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <OutreachAcknowledgementsCard leadId={leadId} contacts={contacts} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading drafts...</p>
      ) : (
        emails?.map((email) => (
          <EmailCard key={email.id} email={email} leadId={leadId} />
        ))
      )}
    </div>
  );
}
