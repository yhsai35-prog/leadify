import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardChartCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  action?: ReactNode;
}

export function DashboardChartCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  contentClassName,
  action,
}: DashboardChartCardProps) {
  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
        className,
      )}
    >
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {action}
          </div>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className={cn("h-80", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
