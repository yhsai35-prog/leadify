import { FLOW_PALETTE } from "./defaultFlows";

interface FlowPaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export function FlowPalette({ onDragStart }: FlowPaletteProps) {
  return (
    <aside className="flex w-52 shrink-0 flex-col gap-2 border-r border-border bg-card/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nodes</p>
      <p className="text-[11px] text-muted-foreground">Drag onto the canvas</p>
      <div className="mt-1 space-y-1.5 overflow-y-auto">
        {FLOW_PALETTE.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className="cursor-grab rounded-lg border border-border bg-background px-2.5 py-2 active:cursor-grabbing hover:border-primary/40"
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-[11px] text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
