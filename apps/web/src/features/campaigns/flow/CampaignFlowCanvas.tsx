import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CampaignChannel,
  CampaignFlowNodeType,
  type CampaignEmailStats,
  type CampaignFlowDefinition,
  validateCampaignFlowForLaunch,
} from "@bluwheelz/shared";
import { Button } from "@/components/ui/button";
import { FlowPalette } from "./FlowPalette";
import { NodeInspector } from "./NodeInspector";
import { buildRecommendedFlow } from "./defaultFlows";
import { campaignFlowNodeTypes, type CampaignFlowNodeData, type FlowStage } from "./nodeTypes";

interface WhatsappTemplateOption {
  name: string;
  language: string;
  status: string;
}

interface CampaignFlowCanvasProps {
  channel: CampaignChannel;
  flowDefinition: CampaignFlowDefinition | null | undefined;
  emailStats?: CampaignEmailStats;
  whatsappStats?: CampaignEmailStats;
  templates: WhatsappTemplateOption[];
  onSave: (flow: CampaignFlowDefinition, channel?: CampaignChannel) => Promise<void> | void;
  onSyncTemplates?: () => void;
  syncingTemplates?: boolean;
  saving?: boolean;
}

function toRfNodes(flow: CampaignFlowDefinition): Node[] {
  return (flow.nodes ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { ...(n.data ?? {}), label: n.data?.label ?? n.type },
    deletable: n.deletable ?? n.type !== CampaignFlowNodeType.APPROVAL,
  }));
}

function toRfEdges(flow: CampaignFlowDefinition): Edge[] {
  return (flow.edges ?? []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
  }));
}

function fromRf(
  nodes: Node[],
  edges: Edge[],
  viewport?: Viewport,
): CampaignFlowDefinition {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as CampaignFlowDefinition["nodes"][number]["type"],
      position: n.position,
      data: (n.data ?? {}) as CampaignFlowDefinition["nodes"][number]["data"],
      deletable: n.deletable,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
    viewport: viewport
      ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
      : undefined,
  };
}

function stageForType(
  type: string,
  stats: CampaignEmailStats | undefined,
): { stage: FlowStage; count?: number } {
  if (!stats) return { stage: "idle" };
  switch (type) {
    case CampaignFlowNodeType.MESSAGE:
    case CampaignFlowNodeType.AI_PERSONALIZE:
      if (stats.draft > 0) return { stage: "active", count: stats.draft };
      if (stats.pendingApproval + stats.approved + stats.sent > 0) return { stage: "done", count: stats.draft };
      return { stage: "idle" };
    case CampaignFlowNodeType.APPROVAL:
      if (stats.pendingApproval > 0) return { stage: "active", count: stats.pendingApproval };
      if (stats.approved + stats.sent > 0) return { stage: "done", count: stats.approved };
      return { stage: "idle" };
    case CampaignFlowNodeType.SEND:
      if (stats.scheduled > 0) return { stage: "active", count: stats.scheduled };
      if (stats.sent > 0) return { stage: "done", count: stats.sent };
      return { stage: "idle" };
    case CampaignFlowNodeType.TRACK_REPLIES:
      return stats.sent > 0 ? { stage: "active", count: stats.sent } : { stage: "idle" };
    default:
      return { stage: "idle" };
  }
}

function CampaignFlowCanvasInner({
  channel,
  flowDefinition,
  emailStats,
  whatsappStats,
  templates,
  onSave,
  onSyncTemplates,
  syncingTemplates,
  saving,
}: CampaignFlowCanvasProps) {
  const stats = channel === CampaignChannel.WHATSAPP ? whatsappStats : emailStats;
  const initial = useMemo(() => {
    if (flowDefinition?.nodes?.length) return flowDefinition;
    return buildRecommendedFlow(channel);
  }, [flowDefinition, channel]);

  const [nodes, setNodes, onNodesChange] = useNodesState(toRfNodes(initial));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRfEdges(initial));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(initial.viewport ?? { x: 0, y: 0, zoom: 0.9 });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    setNodes(toRfNodes(initial));
    setEdges(toRfEdges(initial));
  }, [initial, setNodes, setEdges]);

  useEffect(() => {
    // Avoid feedback loops: only annotate stage metadata when stats change.
    setNodes((prev) =>
      prev.map((n) => {
        const { stage, count } = stageForType(n.type ?? "", stats);
        const data = n.data as CampaignFlowNodeData;
        if (data.stage === stage && data.stageCount === count) return n;
        return {
          ...n,
          data: { ...data, stage, stageCount: count },
        };
      }),
    );
  }, [stats, setNodes]);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const persist = useCallback(
    (nextNodes: Node[], nextEdges: Edge[], nextViewport?: Viewport, nextChannel?: CampaignChannel) => {
      if (skipFirstSave.current) {
        skipFirstSave.current = false;
        return;
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const flow = fromRf(nextNodes, nextEdges, nextViewport ?? viewport);
        void onSave(flow, nextChannel);
      }, 600);
    },
    [onSave, viewport],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, animated: true }, eds);
        persist(nodes, next);
        return next;
      });
    },
    [nodes, persist, setEdges],
  );

  const onSelectionChange = useCallback(({ nodes: selected }: OnSelectionChangeParams) => {
    setSelectedId(selected[0]?.id ?? null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/campaign-flow-node");
      if (!type) return;
      const bounds = (event.target as HTMLElement).closest(".react-flow")?.getBoundingClientRect();
      const position = {
        x: event.clientX - (bounds?.left ?? 0) - 80,
        y: event.clientY - (bounds?.top ?? 0) - 20,
      };
      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type,
        position,
        data: {
          label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          locked: type === CampaignFlowNodeType.APPROVAL,
          channel: type === CampaignFlowNodeType.CHANNEL ? channel : undefined,
          tone: "professional",
          sendMode: "immediate",
        },
        deletable: type !== CampaignFlowNodeType.APPROVAL,
      };
      setNodes((nds) => {
        const next = [...nds, newNode];
        persist(next, edges);
        return next;
      });
    },
    [channel, edges, persist, setNodes],
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/campaign-flow-node", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const updateNodeData = (nodeId: string, patch: Partial<CampaignFlowNodeData>) => {
    setNodes((nds) => {
      const next = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...(n.data as object), ...patch } } : n,
      );
      let nextChannel: CampaignChannel | undefined;
      if (patch.channel === CampaignChannel.EMAIL || patch.channel === CampaignChannel.WHATSAPP) {
        nextChannel = patch.channel;
      }
      persist(next, edges, viewport, nextChannel);
      return next;
    });
  };

  const applyRecommended = () => {
    const flow = buildRecommendedFlow(channel);
    const nextNodes = toRfNodes(flow);
    const nextEdges = toRfEdges(flow);
    setNodes(nextNodes);
    setEdges(nextEdges);
    skipFirstSave.current = false;
    void onSave(flow);
  };

  const validation = validateCampaignFlowForLaunch(fromRf(nodes, edges, viewport), channel);
  const empty = nodes.length === 0;

  return (
    <div className="flex h-[560px] overflow-hidden rounded-xl border border-border bg-background">
      <FlowPalette onDragStart={onDragStart} />
      <div className="relative min-w-0 flex-1">
        {empty && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">Design how this campaign runs</p>
            <Button onClick={applyRecommended}>Use recommended flow</Button>
          </div>
        )}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          {!validation.ok && (
            <span className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
              {validation.errors[0]}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={applyRecommended}>
            Reset flow
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => void onSave(fromRf(nodes, edges, viewport))}
          >
            {saving ? "Saving…" : "Save flow"}
          </Button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          onNodeDragStop={() => persist(nodes, edges, viewport)}
          onEdgesDelete={() => persist(nodes, edges, viewport)}
          onNodesDelete={() => persist(nodes, edges, viewport)}
          onMoveEnd={(_e, vp) => {
            setViewport(vp);
            persist(nodes, edges, vp);
          }}
          nodeTypes={campaignFlowNodeTypes}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} />
          <MiniMap pannable zoomable className="!bg-card" />
          <Controls />
        </ReactFlow>
      </div>
      <NodeInspector
        nodeId={selectedNode?.id ?? null}
        nodeType={selectedNode?.type ?? null}
        data={(selectedNode?.data as CampaignFlowNodeData) ?? null}
        channel={channel}
        templates={templates}
        onChange={updateNodeData}
        onSyncTemplates={onSyncTemplates}
        syncingTemplates={syncingTemplates}
      />
    </div>
  );
}

export function CampaignFlowCanvas(props: CampaignFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CampaignFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
