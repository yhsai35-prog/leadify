import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartEmptyStateProps {
  icon: LucideIcon;
  message: string;
  loading?: boolean;
  onRetry?: () => void;
}

export function ChartEmptyState({ icon: Icon, message, loading, onRetry }: ChartEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="max-w-[220px] text-sm text-muted-foreground">{loading ? "Loading insights..." : message}</p>
      {onRetry && !loading && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
