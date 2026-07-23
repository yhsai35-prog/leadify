import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CampaignRecipient } from "@bluwheelz/shared";
import { useToast } from "@/components/ui/toast";
import {
  useAddManualCampaignRecipient,
  useSetCampaignRecipients,
  useToggleCampaignRecipient,
} from "./useCampaigns";

interface RecipientsPanelProps {
  campaignId: string;
  channel: "email" | "whatsapp";
  recipients: CampaignRecipient[];
  isAdmin: boolean;
}

export function RecipientsPanel({ campaignId, channel, recipients, isAdmin }: RecipientsPanelProps) {
  const toggle = useToggleCampaignRecipient(campaignId);
  const setMany = useSetCampaignRecipients(campaignId);
  const addManual = useAddManualCampaignRecipient(campaignId);
  const { toast } = useToast();
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualLabel, setManualLabel] = useState("");

  const selectedCount = recipients.filter((r) => r.selected).length;
  const withPhone = recipients.filter((r) => r.phone).length;

  function selectAllWithPhone() {
    setMany.mutate(
      {
        recipients: recipients.map((r) => ({
          leadId: r.leadId,
          contactId: r.contactId,
          selected: channel === "whatsapp" ? Boolean(r.phone) : Boolean(r.email),
        })),
      },
      {
        onSuccess: () => toast({ title: "Recipients updated", variant: "success" }),
        onError: (err) => toast({ title: "Update failed", description: err.message, variant: "error" }),
      },
    );
  }

  function clearSelection() {
    setMany.mutate(
      {
        recipients: recipients.map((r) => ({
          leadId: r.leadId,
          contactId: r.contactId,
          selected: false,
        })),
      },
      {
        onSuccess: () => toast({ title: "Selection cleared", variant: "info" }),
        onError: (err) => toast({ title: "Update failed", description: err.message, variant: "error" }),
      },
    );
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const phone = manualPhone.trim();
    const email = manualEmail.trim();
    if (channel === "whatsapp" && !phone) {
      toast({ title: "Enter a phone number", description: "Use country code, e.g. +9198XXXXXXXX", variant: "error" });
      return;
    }
    if (channel === "email" && !email) {
      toast({ title: "Enter an email", variant: "error" });
      return;
    }

    addManual.mutate(
      {
        ...(channel === "whatsapp" ? { phone } : { email }),
        ...(manualLabel.trim() ? { label: manualLabel.trim() } : {}),
      },
      {
        onSuccess: () => {
          setManualPhone("");
          setManualEmail("");
          setManualLabel("");
          toast({
            title: channel === "whatsapp" ? "Test number added" : "Test email added",
            description: "It is selected for this campaign. Clear other recipients if you only want to test this one.",
            variant: "success",
          });
        },
        onError: (err) => toast({ title: "Could not add", description: err.message, variant: "error" }),
      },
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add test {channel === "whatsapp" ? "number" : "email"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {channel === "whatsapp"
                ? "Add your personal WhatsApp number to test before sending to real leads. Use E.164 with country code (e.g. +91…)."
                : "Add a personal inbox to dry-run the email campaign."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitManual} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[10rem] flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Label (optional)</label>
                <Input
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  placeholder="My phone"
                  disabled={addManual.isPending}
                />
              </div>
              {channel === "whatsapp" ? (
                <div className="min-w-[14rem] flex-[1.2] space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <Input
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="+919876543210"
                    inputMode="tel"
                    autoComplete="tel"
                    disabled={addManual.isPending}
                  />
                </div>
              ) : (
                <div className="min-w-[14rem] flex-[1.2] space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={addManual.isPending}
                  />
                </div>
              )}
              <Button type="submit" disabled={addManual.isPending}>
                {addManual.isPending ? "Adding…" : "Add & select"}
              </Button>
            </form>
            {channel === "whatsapp" && (
              <p className="mt-3 text-xs text-muted-foreground">
                On Meta sandbox / unpaid numbers, add this phone under WhatsApp → API Setup →{" "}
                <span className="font-medium">To</span> test numbers first, or the send will fail.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recipients</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose which {channel === "whatsapp" ? "phone numbers" : "emails"} this campaign will message.
              {channel === "whatsapp" && ` ${withPhone} contacts have phones · ${selectedCount} selected.`}
            </p>
          </div>
          {isAdmin && recipients.length > 0 && (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={selectAllWithPhone} disabled={setMany.isPending}>
                Select all with {channel === "whatsapp" ? "phone" : "email"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearSelection} disabled={setMany.isPending}>
                Clear
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {channel === "whatsapp"
                ? "No recipients yet. Add a test number above, or add leads with phone numbers."
                : "Add leads to this campaign first, or add a test email above."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Send</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>{channel === "whatsapp" ? "Phone" : "Email"}</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r) => {
                  const canSelect = channel === "whatsapp" ? Boolean(r.phone) : Boolean(r.email);
                  const isTest = r.companyName === "WhatsApp Test Numbers";
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          disabled={!isAdmin || !canSelect || toggle.isPending}
                          checked={r.selected}
                          onChange={(e) =>
                            toggle.mutate(
                              { contactId: r.contactId, selected: e.target.checked },
                              {
                                onError: (err) =>
                                  toast({ title: "Could not update", description: err.message, variant: "error" }),
                              },
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.contactName ?? "Unknown"}
                        {isTest && (
                          <Badge variant="outline" className="ml-2">
                            Test
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{r.companyName ?? "—"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {channel === "whatsapp" ? r.phone ?? "No phone" : r.email ?? "No email"}
                      </TableCell>
                      <TableCell>
                        {!canSelect ? (
                          <Badge variant="outline">Missing {channel === "whatsapp" ? "phone" : "email"}</Badge>
                        ) : r.selected ? (
                          <Badge variant="success">Selected</Badge>
                        ) : (
                          <Badge variant="secondary">Skipped</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
