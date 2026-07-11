import { GitCompareArrows } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useComputeSimilarity, useSimilarityMatches } from "@/features/pipeline/usePipeline";
import { useToast } from "@/components/ui/toast";

export function SimilarClientCard({ leadId }: { leadId: string }) {
  const { data: matches, isLoading } = useSimilarityMatches(leadId);
  const compute = useComputeSimilarity(leadId);
  const { toast } = useToast();

  const topMatch = matches?.[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4" />
          Most Similar Existing Client
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={compute.isPending}
          onClick={() => compute.mutate(undefined, { onError: (err) => toast({ title: "Similarity computation failed", description: err.message, variant: "error" }) })}
        >
          {compute.isPending ? "Computing..." : "Recompute"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !topMatch ? (
          <p className="text-sm text-muted-foreground">No similarity match yet. Click Recompute to find the closest existing client.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{topMatch.existingClientName}</span>
              <span className="text-2xl font-bold text-primary">{topMatch.similarityPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${topMatch.similarityPct}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{topMatch.reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
