import { Newspaper, TrendingUp, Truck, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useCompanyIntelligence, useTriggerResearch } from "@/features/pipeline/usePipeline";

export function IntelligenceTab({ companyId, leadId }: { companyId: string; leadId?: string }) {
  const { data: intelligence, isLoading } = useCompanyIntelligence(companyId);
  const research = useTriggerResearch(companyId, leadId);
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={research.isPending}
          onClick={() => research.mutate(undefined, { onError: (err) => toast({ title: "Research failed", description: err.message, variant: "error" }) })}
        >
          {research.isPending ? "Researching..." : intelligence ? "Refresh Research" : "Run AI Research"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !intelligence ? (
        <p className="text-sm text-muted-foreground">No intelligence generated yet for this company.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Website Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{intelligence.websiteSummary || "Not available"}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Model</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{intelligence.businessModel || "Not available"}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" /> Fleet Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              {intelligence.fleetIndicators.length === 0 ? (
                <p className="text-sm text-muted-foreground">None found</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {intelligence.fleetIndicators.map((f, i) => (
                    <Badge key={i} variant="outline">{f}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Growth & Expansion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
              {[...intelligence.growthIndicators, ...intelligence.expansionSignals].length === 0 ? (
                <p>None found</p>
              ) : (
                [...intelligence.growthIndicators, ...intelligence.expansionSignals].map((g, i) => <p key={i}>&bull; {g}</p>)
              )}
            </CardContent>
          </Card>
          {intelligence.news.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Newspaper className="h-4 w-4" /> Recent News</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {intelligence.news.map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noreferrer" className="block text-sm text-primary hover:underline">
                    {n.title}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
