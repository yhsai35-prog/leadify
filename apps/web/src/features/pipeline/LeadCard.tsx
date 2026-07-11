import { useNavigate } from "react-router-dom";
import type { Lead } from "@bluwheelz/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "./PriorityBadge";

export function LeadCard({ lead }: { lead: Lead }) {
  const navigate = useNavigate();

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/pipeline/${lead.id}`)}>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{lead.company?.name ?? "Unknown company"}</p>
          {lead.icpScore !== null && (
            <Badge variant={lead.icpScore >= 70 ? "success" : lead.icpScore >= 50 ? "warning" : "outline"}>{lead.icpScore}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{lead.company?.industry ?? "Unclassified"}</p>
        <PriorityBadge priority={lead.priority} />
      </CardContent>
    </Card>
  );
}
