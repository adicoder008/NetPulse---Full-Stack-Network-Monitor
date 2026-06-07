import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Server, Globe } from "lucide-react";
import type { Service } from "@/types";
import { cn } from "@/lib/utils";

type ServiceNodeData = {
  label: string;
  status: string;
  statusCode?: number | null;
  latency?: number;
  serviceId: string;
};

function ServiceNode({ data, selected }: NodeProps<Node<ServiceNodeData>>) {
  const statusStyles = {
    UP: data.statusCode != null && data.statusCode >= 400
      ? "border-status-warning/50 bg-status-warning/5"
      : "border-status-healthy/50 bg-status-healthy/5",
    DOWN: "border-status-critical/50 bg-status-critical/5",
    UNKNOWN: "border-status-offline/50 bg-status-offline/5"
  };

  const dotColor = {
    UP: data.statusCode != null && data.statusCode >= 400 ? "bg-status-warning" : "bg-status-healthy",
    DOWN: "bg-status-critical animate-pulse-soft",
    UNKNOWN: "bg-status-offline"
  };

  const style = statusStyles[data.status as keyof typeof statusStyles] ?? statusStyles.UNKNOWN;
  const dot = dotColor[data.status as keyof typeof dotColor] ?? dotColor.UNKNOWN;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 min-w-[140px] shadow-sm transition-shadow",
        style,
        selected && "ring-1 ring-status-activity/50"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-edge !w-2 !h-2 !border-none" />
      <div className="flex items-center gap-2">
        <Server className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="text-xs font-medium text-slate-200 truncate">{data.label}</span>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 ml-auto", dot)} />
      </div>
      {data.latency != null && (
        <div className="text-2xs text-slate-500 mt-1 tabular-nums">
          {data.latency} ms
          {data.statusCode != null && data.statusCode > 0 ? ` · HTTP ${data.statusCode}` : ""}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-edge !w-2 !h-2 !border-none" />
    </div>
  );
}

function HubNode({ data }: NodeProps<Node<{ label: string }>>) {
  return (
    <div className="rounded-lg border border-status-activity/40 bg-status-activity/10 px-4 py-3 min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!bg-status-activity !w-2 !h-2 !border-none" />
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-status-activity" />
        <span className="text-xs font-semibold text-status-activity">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-status-activity !w-2 !h-2 !border-none" />
    </div>
  );
}

const nodeTypes = { serviceNode: ServiceNode, hubNode: HubNode };

type NetworkTopologyProps = {
  services: Service[];
  className?: string;
};

export function NetworkTopology({ services, className }: NetworkTopologyProps) {
  const navigate = useNavigate();

  const { nodes, edges } = useMemo(() => {
    const hubId = "netpulse-hub";
    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(services.length))));
    const spacingX = 200;
    const spacingY = 120;

    const hubNode: Node = {
      id: hubId,
      type: "hubNode",
      position: { x: (cols * spacingX) / 2 - 60, y: 0 },
      data: { label: "NetPulse Collector" }
    };

    const serviceNodes: Node[] = services.map((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        id: s.id,
        type: "serviceNode",
        position: { x: col * spacingX, y: 100 + row * spacingY },
        data: {
          label: s.name,
          status: s.lastKnownStatus,
          statusCode: s.latest?.statusCode,
          latency: s.latest?.latencyMs,
          serviceId: s.id
        }
      };
    });

    const serviceEdges: Edge[] = services.map((s) => {
      const isDown = s.lastKnownStatus === "DOWN";
      return {
        id: `${hubId}-${s.id}`,
        source: hubId,
        target: s.id,
        animated: s.lastKnownStatus === "UP",
        style: {
          stroke: isDown ? "#ef4444" : s.lastKnownStatus === "UNKNOWN" ? "#64748b" : "#06b6d4",
          strokeWidth: isDown ? 2 : 1.5,
          strokeDasharray: isDown ? "4 4" : undefined
        }
      };
    });

    return { nodes: [hubNode, ...serviceNodes], edges: serviceEdges };
  }, [services]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== "netpulse-hub") {
        navigate(`/nodes/${node.id}`);
      }
    },
    [navigate]
  );

  if (services.length === 0) {
    return (
      <div className={cn("panel flex items-center justify-center h-[480px] text-slate-500 text-sm", className)}>
        No services to display. Add services to see network topology.
      </div>
    );
  }

  return (
    <div className={cn("panel h-[480px]", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#1e2330" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const status = (n.data as ServiceNodeData)?.status;
            if (status === "UP") return "#22c55e";
            if (status === "DOWN") return "#ef4444";
            return "#64748b";
          }}
          maskColor="rgba(15, 17, 23, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
