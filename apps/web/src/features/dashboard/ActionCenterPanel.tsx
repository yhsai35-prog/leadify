import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionQueueType } from "@bluwheelz/shared";
import type { DashboardQueryParams } from "./useDashboard";
import { useActionQueue } from "./useDashboard";

const ACTION_HINTS: Partial<Record<ActionQueueType, string>> = {
  draft_ready: "Review email draft on Outreach",
};

export function ActionCenterPanel({ params }: { params: DashboardQueryParams }) {
  const { data: items, isLoading, isError, refetch } = useActionQueue(params);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04]">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Action center</CardTitle>
        </div>
        <Badge variant="outline" className="text-xs">
          {isLoading ? "…" : `${items?.length ?? 0} items`}
        </Badge>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Could not load action items.
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your work queue…</p>
        ) : !items || items.length === 0 ? (
          <p className="text-sm text-muted-foreground">You are caught up — no urgent actions right now.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.type}
                to={item.href}
                className="group flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {ACTION_HINTS[item.type] ?? "Tap to review"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{item.count}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
