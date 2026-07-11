import { useParams, Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntelligenceTab } from "@/features/intelligence/IntelligenceTab";
import { useExistingClientProfile } from "@/features/similarity/useSimilarity";
import { formatCompanyFirmographics } from "./formatCompanyFirmographics";
import { useCompany, useCompanyContacts } from "./useCompanies";

function formatVertical(vertical: string): string {
  return vertical.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? "/companies";
  const backLabel = backTo === "/similarity" ? "Back to client similarity" : "Back to companies";

  const { data: company, isLoading } = useCompany(id);
  const { data: contacts } = useCompanyContacts(id);
  const { data: clientProfile } = useExistingClientProfile(company?.isExistingClient ? id : undefined);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!company || !id) return <p className="text-sm text-muted-foreground">Company not found.</p>;

  const metadata = company.metadata as { city?: string; companyPhone?: string } | undefined;
  const operationalPatterns = clientProfile?.operationalPatterns;
  const patternEntries =
    operationalPatterns && Object.keys(operationalPatterns).length > 0
      ? Object.entries(operationalPatterns)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link to={backTo} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          {company.isExistingClient && <Badge variant="success">Existing Client</Badge>}
        </div>
        {metadata?.companyPhone && (
          <p className="text-sm text-muted-foreground">Company phone: {metadata.companyPhone}</p>
        )}
        <p className="text-sm text-muted-foreground">{formatCompanyFirmographics(company)}</p>
        {company.domain && <p className="text-sm text-muted-foreground">{company.domain}</p>}
      </div>

      {company.isExistingClient && clientProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Existing Client Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{formatVertical(clientProfile.vertical)}</Badge>
              {company.fleetSizeEstimate != null && (
                <Badge variant="outline">~{company.fleetSizeEstimate} vehicles</Badge>
              )}
              {company.revenueInrCr != null && (
                <Badge variant="outline">₹{company.revenueInrCr} Cr revenue</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{clientProfile.profileSummary}</p>
            {patternEntries ? (
              <div>
                <p className="mb-1 font-medium">Operational patterns</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {patternEntries.map(([key, value]) => (
                    <li key={key}>
                      {key.replace(/_/g, " ")}: {String(value)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Operational pattern details will appear here after profile enrichment.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision Makers</CardTitle>
        </CardHeader>
        <CardContent>
          {!contacts || contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts on file yet.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {contacts.map((c) => (
                <div key={c.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.title ?? "Unknown title"}</p>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  {typeof c.metadata?.phone === "string" && (
                    <p className="text-xs text-muted-foreground">{c.metadata.phone}</p>
                  )}
                  {c.linkedinUrl && (
                    <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      LinkedIn
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <IntelligenceTab companyId={id} />
    </div>
  );
}
