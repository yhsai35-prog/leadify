import { ICP_SCORE_WEIGHTS } from "@bluwheelz/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/features/pipeline/PriorityBadge";
import { useLatestScore, useQualifyLead } from "@/features/pipeline/usePipeline";
import { useToast } from "@/components/ui/toast";

const DIMENSIONS = [
  { key: "industry", label: "Industry Fit" },
  { key: "size", label: "Size Fit" },
  { key: "operations", label: "Operations Fit" },
  { key: "growth", label: "Growth Signal" },
  { key: "similarity", label: "Client Similarity" },
] as const;

export function ScoreBreakdownCard({ leadId }: { leadId: string }) {
  const { data: score, isLoading, isError } = useLatestScore(leadId);
  const qualify = useQualifyLead(leadId);
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>ICP Score</CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={qualify.isPending}
          onClick={() => qualify.mutate(undefined, { onError: (err) => toast({ title: "Qualification failed", description: err.message, variant: "error" }) })}
        >
          {qualify.isPending ? "Analyzing..." : score ? "Re-qualify" : "Qualify with AI"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : isError || !score ? (
          <p className="text-sm text-muted-foreground">This lead has not been qualified yet. Run AI qualification to see its ICP score.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold">{score.icpScore}</span>
              <PriorityBadge priority={score.priority} />
            </div>
            <p className="text-sm">{score.reasoning}</p>
            <div className="space-y-2">
              {DIMENSIONS.map(({ key, label }) => {
                const value = score.scoreBreakdown[key];
                const max = ICP_SCORE_WEIGHTS[key];
                return (
                  <div key={key}>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{label}</span>
                      <span>{value}/{max}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(value / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {score.painPoints.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pain Points</p>
                <div className="flex flex-wrap gap-1.5">
                  {score.painPoints.map((point, i) => (
                    <Badge key={i} variant="outline">{point}</Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
