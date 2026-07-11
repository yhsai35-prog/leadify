import { useEffect, useState } from "react";
import { Building2, Kanban, Loader2, UserPlus, Users } from "lucide-react";

const STEPS = [
  { icon: Building2, label: "Importing company profiles..." },
  { icon: UserPlus, label: "Creating contacts and decision makers..." },
  { icon: Kanban, label: "Adding leads to your pipeline..." },
  { icon: Users, label: "Finalizing workspace records..." },
] as const;

interface LeadsFoundPromoteLoadingProps {
  count: number;
}

export function LeadsFoundPromoteLoading({ count }: LeadsFoundPromoteLoadingProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const currentStep = STEPS[stepIndex] ?? STEPS[0];
  const StepIcon = currentStep.icon;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-card/50 px-6 py-12 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>

      <h2 className="text-lg font-medium">Adding to pipeline</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Processing {count} {count === 1 ? "company" : "companies"}. This may take a minute while we import profiles,
        create contacts, and add them to your pipeline.
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm text-primary">
        <StepIcon className="h-4 w-4" />
        <span className="animate-pulse">{currentStep.label}</span>
      </div>

      <div className="mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[discovery-progress_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}
