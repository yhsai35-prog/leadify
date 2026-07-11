import { useEffect, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriorityBadge } from "./PriorityBadge";
import { StatusTransitionSelect } from "./StatusTransitionSelect";
import { TimelineTab } from "./TimelineTab";
import { ScoreBreakdownCard } from "@/features/qualification/ScoreBreakdownCard";
import { SimilarClientCard } from "@/features/similarity/SimilarClientCard";
import { IntelligenceTab } from "@/features/intelligence/IntelligenceTab";
import { EmailGeneratorPanel } from "@/features/outreach/EmailGeneratorPanel";
import { useCompanyContacts } from "@/features/companies/useCompanies";
import { formatCompanyFirmographics } from "@/features/companies/formatCompanyFirmographics";
import { useLead } from "./usePipeline";

const LEAD_TABS = ["intelligence", "outreach", "timeline"] as const;
type LeadTab = (typeof LEAD_TABS)[number];

function isLeadTab(value: string | null): value is LeadTab {
  return LEAD_TABS.includes(value as LeadTab);
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: lead, isLoading } = useLead(id);
  const { data: contacts } = useCompanyContacts(lead?.companyId);

  const tabParam = searchParams.get("tab");

  const activeTab = useMemo((): LeadTab => {
    if (isLeadTab(tabParam)) return tabParam;
    if (lead?.pipelineStatus === "draft_ready") return "outreach";
    return "intelligence";
  }, [tabParam, lead?.pipelineStatus]);

  useEffect(() => {
    if (!lead || isLeadTab(tabParam)) return;
    if (lead.pipelineStatus !== "draft_ready") return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", "outreach");
    setSearchParams(next, { replace: true });
  }, [lead, tabParam, searchParams, setSearchParams]);

  const handleTabChange = (tab: string) => {
    if (!isLeadTab(tab)) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading lead...</p>;
  if (!lead) return <p className="text-sm text-muted-foreground">Lead not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link to="/pipeline" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to pipeline
          </Link>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">{lead.company?.name}</h1>
            <PriorityBadge priority={lead.priority} />
          </div>
          <p className="text-sm text-muted-foreground">
            {lead.company ? formatCompanyFirmographics(lead.company) : "Unclassified"}
          </p>
        </div>
        <StatusTransitionSelect leadId={lead.id} currentStatus={lead.pipelineStatus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreBreakdownCard leadId={lead.id} />
        <SimilarClientCard leadId={lead.id} />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="intelligence">Company Intelligence</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="intelligence">
          <IntelligenceTab companyId={lead.companyId} leadId={lead.id} />
        </TabsContent>
        <TabsContent value="outreach">
          <EmailGeneratorPanel leadId={lead.id} companyId={lead.companyId} contacts={contacts ?? (lead.contact ? [lead.contact] : [])} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineTab leadId={lead.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
