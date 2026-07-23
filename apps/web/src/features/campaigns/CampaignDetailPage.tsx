import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Play,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import type { CampaignBatchResult, CampaignFlowDefinition, PipelineStatus, WhatsappTemplate } from "@bluwheelz/shared";
import { CampaignChannel, ROLE_RANK, UserRole } from "@bluwheelz/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { cn, titleCase } from "@/lib/utils";
import { usePipelineBoard } from "@/features/pipeline/usePipeline";
import { CampaignFlowCanvas } from "./flow/CampaignFlowCanvas";
import {
  CAMPAIGN_STATUSES,
  useAddLeadsToCampaign,
  useCampaign,
  useGenerateCampaignEmails,
  useLaunchCampaign,
  useRemoveLeadsFromCampaign,
  useSubmitCampaign,
  useUpdateCampaign,
} from "./useCampaigns";

const STATUS_VARIANT = {
  draft: "outline",
  active: "success",
  paused: "warning",
  completed: "secondary",
} as const;

const ACTIVE_EMAIL = new Set(["draft", "pending_approval", "approved", "scheduled", "sent"]);

const CONTACT_STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "secondary" | "destructive"> = {
  draft: "outline",
  pending_approval: "warning",
  approved: "success",
  scheduled: "secondary",
  sent: "success",
  failed: "destructive",
  rejected: "destructive",
};

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function contactStatusLabel(status: string | null) {
  if (!status) return "Not started";
  return titleCase(status);
}

function batchToast(
  toast: ReturnType<typeof useToast>["toast"],
  title: string,
  result: CampaignBatchResult,
) {
  const parts: string[] = [];
  if (result.generated !== undefined) parts.push(`${result.generated} generated`);
  if (result.submitted !== undefined) parts.push(`${result.submitted} submitted`);
  if (result.scheduled !== undefined) parts.push(`${result.scheduled} scheduled`);
  if (result.skipped) parts.push(`${result.skipped} skipped`);
  if (result.failed.length) parts.push(`${result.failed.length} failed`);
  toast({
    title,
    description: parts.join(", ") || "Done",
    variant: result.failed.length ? "info" : "success",
  });
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = Boolean(user && ROLE_RANK[user.role] >= ROLE_RANK[UserRole.ADMIN]);

  const { data: detail, isLoading } = useCampaign(id);
  const { data: board } = usePipelineBoard();
  const updateCampaign = useUpdateCampaign(id!);
  const addLeads = useAddLeadsToCampaign(id!);
  const removeLeads = useRemoveLeadsFromCampaign(id!);
  const generateEmails = useGenerateCampaignEmails(id!);
  const submitAll = useSubmitCampaign(id!);
  const launch = useLaunchCampaign(id!);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [removeLeadIds, setRemoveLeadIds] = useState<Set<string>>(new Set());
  const [launchOpen, setLaunchOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [lastBatchResult, setLastBatchResult] = useState<CampaignBatchResult | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PipelineStatus | "all">("all");
  const [contactFilter, setContactFilter] = useState<"all" | "has_contact" | "no_contact">("all");
  const [tab, setTab] = useState<"flow" | "leads" | "activity">("flow");
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => apiClient.get<{ data: WhatsappTemplate[] }>("/whatsapp/templates").then((r) => r.data),
  });
  const syncTemplates = useMutation({
    mutationFn: () => apiClient.post<{ data: WhatsappTemplate[] }>("/whatsapp/templates/sync"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast({ title: "Templates synced from Meta", variant: "success" });
    },
    onError: (err: Error) => toast({ title: "Template sync failed", description: err.message, variant: "error" }),
  });

  const availableLeads = useMemo(() => {
    if (!board) return [];
    const inCampaign = new Set(detail?.leads.map((l) => l.leadId) ?? []);
    return Object.values(board)
      .flat()
      .filter((lead) => !inCampaign.has(lead.id));
  }, [board, detail?.leads]);

  const filteredAvailableLeads = useMemo(() => {
    return availableLeads.filter((lead) => {
      if (leadSearch && !lead.company?.name?.toLowerCase().includes(leadSearch.toLowerCase())) return false;
      if (statusFilter !== "all" && lead.pipelineStatus !== statusFilter) return false;
      if (contactFilter === "has_contact" && !lead.contactId) return false;
      if (contactFilter === "no_contact" && lead.contactId) return false;
      return true;
    });
  }, [availableLeads, leadSearch, statusFilter, contactFilter]);

  const isWhatsapp = detail?.campaign.channel === CampaignChannel.WHATSAPP;
  const channelStats = isWhatsapp
    ? (detail?.whatsappStats ?? detail?.emailStats)
    : detail?.emailStats;

  const readiness = useMemo(() => {
    if (!detail || !channelStats) return null;
    let contactsReadyToGenerate = 0;
    let contactsMissingIdentity = 0;
    for (const lead of detail.leads) {
      for (const c of lead.companyContacts) {
        const identity = isWhatsapp ? c.phone : c.email;
        const status = isWhatsapp ? c.latestWhatsappStatus : c.latestEmailStatus;
        if (identity) {
          if (!status || !ACTIVE_EMAIL.has(status)) contactsReadyToGenerate += 1;
        } else {
          contactsMissingIdentity += 1;
        }
      }
    }
    return {
      contactsReadyToGenerate,
      contactsMissingIdentity,
      drafts: channelStats.draft,
      pending: channelStats.pendingApproval,
      sent: channelStats.sent,
    };
  }, [detail, channelStats, isWhatsapp]);

  const workflowStep = useMemo(() => {
    if (!detail || !readiness) return 0;
    if (detail.leads.length === 0) return 0;
    if (readiness.contactsReadyToGenerate > 0) return 1;
    if (readiness.drafts > 0) return 2;
    if (readiness.pending > 0) return 3;
    if (readiness.sent > 0) return 4;
    return 2;
  }, [detail, readiness]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading campaign...</p>;
  if (!detail) return <p className="text-sm text-muted-foreground">Campaign not found.</p>;

  const { campaign, leads, pipelineBreakdown, emailStats, whatsappStats } = detail;
  const stats =
    (campaign.channel === CampaignChannel.WHATSAPP ? whatsappStats : emailStats) ??
    emailStats ?? {
      draft: 0,
      pendingApproval: 0,
      approved: 0,
      scheduled: 0,
      sent: 0,
      failed: 0,
    };
  const hasApproved = stats.approved > 0;

  const workflowSteps = [
    { label: "Add leads", count: leads.length },
    { label: "Generate", count: stats.draft },
    { label: "Submit", count: stats.draft },
    { label: "Approve", count: stats.pendingApproval },
    { label: "Sent", count: stats.sent },
  ];

  async function saveFlow(flow: CampaignFlowDefinition, nextChannel?: CampaignChannel) {
    await updateCampaign.mutateAsync({
      flowDefinition: flow,
      ...(nextChannel ? { channel: nextChannel } : {}),
    });
  }

  function toggleLead(leadId: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  function toggleRemoveLead(leadId: string) {
    setRemoveLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedLeadIds(new Set(filteredAvailableLeads.map((l) => l.id)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <Link to="/campaigns" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to campaigns
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
            <Badge variant="secondary">{campaign.channel === "whatsapp" ? "WhatsApp" : "Email"}</Badge>
            <Badge variant={STATUS_VARIANT[campaign.status]}>{titleCase(campaign.status)}</Badge>
          </div>
          {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
        </div>

        {isAdmin && (
          <Select
            value={campaign.status}
            onValueChange={(status) =>
              updateCampaign.mutate(
                { status: status as typeof campaign.status },
                { onError: (err) => toast({ title: "Could not update status", description: err.message, variant: "error" }) },
              )
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {titleCase(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
        {(["flow", "leads", "activity"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {tab === "flow" && (
        <CampaignFlowCanvas
          channel={campaign.channel ?? CampaignChannel.EMAIL}
          flowDefinition={campaign.flowDefinition}
          emailStats={emailStats}
          whatsappStats={whatsappStats}
          templates={(templatesQuery.data ?? []).map((t) => ({
            name: t.name,
            language: t.language,
            status: t.status,
          }))}
          onSave={saveFlow}
          onSyncTemplates={() => syncTemplates.mutate()}
          syncingTemplates={syncTemplates.isPending}
          saving={updateCampaign.isPending}
        />
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6">
          {workflowSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              {i <= workflowStep ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={i === workflowStep ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
                {step.label}
                {step.count > 0 && i !== 0 && <span className="ml-1 text-muted-foreground">({step.count})</span>}
              </span>
              {i < workflowSteps.length - 1 && <span className="mx-1 text-muted-foreground">→</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      {readiness && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{readiness.contactsReadyToGenerate}</span> contacts ready to generate
            </p>
            {readiness.contactsMissingIdentity > 0 && (
              <p className="text-muted-foreground">
                {readiness.contactsMissingIdentity} contacts missing{" "}
                {campaign.channel === "whatsapp" ? "phone" : "email"} — update on the lead page
              </p>
            )}
            <p>
              <span className="font-medium">{readiness.drafts}</span> drafts ready to submit
            </p>
            {readiness.pending > 0 && (
              <p>
                <span className="font-medium">{readiness.pending}</span> pending in{" "}
                <Link to={`/approval?campaignId=${id}`} className="text-primary underline-offset-4 hover:underline">
                  Approval Center
                </Link>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {campaign.channel === "whatsapp"
                ? "WhatsApp messages send via Meta Cloud API when approved."
                : "Emails send when approved in Approval Center (Gmail/SMTP)."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Leads" value={leads.length} />
        <KpiCard label="Drafts" value={stats.draft} />
        <KpiCard label="Pending approval" value={stats.pendingApproval} />
        <KpiCard label="Approved" value={stats.approved} />
        <KpiCard label="Sent" value={stats.sent} />
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add leads
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add leads from pipeline</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Search company..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PipelineStatus | "all")}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {["imported", "research_complete", "draft_ready", "pending_approval", "approved", "sent"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {titleCase(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={contactFilter} onValueChange={(v) => setContactFilter(v as typeof contactFilter)}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Contact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All leads</SelectItem>
                        <SelectItem value="has_contact">Has contact</SelectItem>
                        <SelectItem value="no_contact">No contact</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                      Select all visible
                    </Button>
                  </div>
                </div>
                {filteredAvailableLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No matching leads available.</p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                    {filteredAvailableLeads.map((lead) => (
                      <label
                        key={lead.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                        />
                        <span className="font-medium">{lead.company?.name ?? "Unknown"}</span>
                        <span className="text-muted-foreground">{titleCase(lead.pipelineStatus)}</span>
                      </label>
                    ))}
                  </div>
                )}
                <DialogFooter>
                  <Button
                    disabled={selectedLeadIds.size === 0 || addLeads.isPending}
                    onClick={() =>
                      addLeads.mutate([...selectedLeadIds], {
                        onSuccess: () => {
                          setAddOpen(false);
                          setSelectedLeadIds(new Set());
                          setLeadSearch("");
                          toast({ title: "Leads added", variant: "success" });
                        },
                        onError: (err) => toast({ title: "Could not add leads", description: err.message, variant: "error" }),
                      })
                    }
                  >
                    Add {selectedLeadIds.size > 0 ? `(${selectedLeadIds.size})` : ""}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant={workflowStep === 1 ? "default" : "outline"}
              className="gap-2"
              disabled={(readiness?.contactsReadyToGenerate ?? 0) === 0 || generateEmails.isPending}
              onClick={() =>
                generateEmails.mutate(undefined, {
                  onSuccess: (res) => {
                    setLastBatchResult(res.data);
                    batchToast(toast, isWhatsapp ? "WhatsApp drafts generated" : "Emails generated", res.data);
                  },
                  onError: (err) => toast({ title: "Generation failed", description: err.message, variant: "error" }),
                })
              }
            >
              <Sparkles className="h-4 w-4" /> Generate all
            </Button>

            <Button
              variant={workflowStep === 2 ? "default" : "outline"}
              className="gap-2"
              disabled={stats.draft === 0 || submitAll.isPending}
              onClick={() =>
                submitAll.mutate(undefined, {
                  onSuccess: (res) => {
                    setLastBatchResult(res.data);
                    batchToast(toast, "Submitted for approval", res.data);
                  },
                  onError: (err) => toast({ title: "Submit failed", description: err.message, variant: "error" }),
                })
              }
            >
              <Send className="h-4 w-4" /> Submit all
            </Button>

            {stats.pendingApproval > 0 && (
              <Button asChild variant="outline" className="gap-2">
                <Link to={`/approval?campaignId=${id}`}>
                  Review in Approval Center ({stats.pendingApproval})
                </Link>
              </Button>
            )}

            {hasApproved && (
              <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={launch.isPending}>
                    <Play className="h-4 w-4" /> Schedule approved (optional)
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule approved emails</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-1.5">
                    <Label htmlFor="scheduled-at">Send at (optional)</Label>
                    <Input
                      id="scheduled-at"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Normally emails send when approved. Use this only to defer already-approved emails to a specific time.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button
                      className="gap-2"
                      disabled={launch.isPending}
                      onClick={() => {
                        const payload = scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {};
                        launch.mutate(payload, {
                          onSuccess: (res) => {
                            setLaunchOpen(false);
                            setScheduledAt("");
                            setLastBatchResult(res.data);
                            batchToast(toast, "Emails scheduled", res.data);
                          },
                          onError: (err) =>
                            toast({ title: "Schedule failed", description: err.message, variant: "error" }),
                        });
                      }}
                    >
                      <Calendar className="h-4 w-4" /> Confirm schedule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {removeLeadIds.size > 0 && (
              <Button
                variant="destructive"
                className="gap-2"
                disabled={removeLeads.isPending}
                onClick={() =>
                  removeLeads.mutate([...removeLeadIds], {
                    onSuccess: () => {
                      setRemoveLeadIds(new Set());
                      toast({ title: "Leads removed from campaign", variant: "success" });
                    },
                    onError: (err) =>
                      toast({ title: "Could not remove leads", description: err.message, variant: "error" }),
                  })
                }
              >
                <Trash2 className="h-4 w-4" /> Remove ({removeLeadIds.size})
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {lastBatchResult && lastBatchResult.failed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Batch details</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {lastBatchResult.failed.map((f, i) => (
                <li key={i}>
                  {f.name ?? f.leadId ?? "Item"}: {f.reason}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {Object.keys(pipelineBreakdown).length > 0 && tab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(pipelineBreakdown).map(([status, count]) => (
              <Badge key={status} variant="outline">
                {titleCase(status)}: {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {(tab === "leads" || tab === "activity") && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads in campaign</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads yet.{isAdmin ? " Use Add leads to pull companies from your pipeline." : ""}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead className="w-10" />}
                  <TableHead>Company</TableHead>
                  <TableHead>Pipeline status</TableHead>
                  <TableHead>Latest outreach</TableHead>
                  <TableHead>Contacts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.leadId}
                    className="cursor-pointer"
                    onClick={() => navigate(`/pipeline/${lead.leadId}`)}
                  >
                    {isAdmin && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={removeLeadIds.has(lead.leadId)}
                          onChange={() => toggleRemoveLead(lead.leadId)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{titleCase(lead.pipelineStatus)}</Badge>
                    </TableCell>
                    <TableCell>
                      {(isWhatsapp ? lead.latestWhatsappStatus : lead.latestEmailStatus) ? (
                        <Badge variant="secondary">
                          {titleCase((isWhatsapp ? lead.latestWhatsappStatus : lead.latestEmailStatus) ?? "")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {lead.companyContacts.length === 0 ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <div className="space-y-2 text-sm">
                          {lead.companyContacts.map((contact) => {
                            const status = isWhatsapp ? contact.latestWhatsappStatus : contact.latestEmailStatus;
                            return (
                            <div key={contact.contactId} className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className={contact.isPrimary ? "font-medium text-foreground" : "text-foreground"}>
                                    {contact.name}
                                  </p>
                                  {contact.isPrimary && (
                                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                      Primary
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground">
                                  {isWhatsapp
                                    ? contact.phone ?? "Phone missing"
                                    : contact.email ?? "Email not revealed"}
                                </p>
                              </div>
                              <Badge
                                variant={CONTACT_STATUS_VARIANT[status ?? ""] ?? "outline"}
                                className="shrink-0"
                              >
                                {contactStatusLabel(status)}
                              </Badge>
                            </div>
                          );})}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
