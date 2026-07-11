import type { Priority } from "@bluwheelz/shared";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

const VARIANT: Record<Priority, "destructive" | "warning" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant={VARIANT[priority]}>{titleCase(priority)}</Badge>;
}
