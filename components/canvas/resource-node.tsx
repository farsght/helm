"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { BookOpen, Plug, Cpu, Database, FileText } from "lucide-react";

/**
 * ResourceNode — circle that attaches to a host node via dashed
 * resource edges. Represents config-time attachments (skill, MCP,
 * model, memory), not flow steps.
 */

export const RESOURCE_NODE_TYPES = {
  skill: { icon: BookOpen, color: "border-blue-500/60 text-blue-300", bg: "bg-blue-500/10", label: "Skill" },
  mcp: { icon: Plug, color: "border-emerald-500/60 text-emerald-300", bg: "bg-emerald-500/10", label: "MCP Server" },
  model: { icon: Cpu, color: "border-purple-500/60 text-purple-300", bg: "bg-purple-500/10", label: "Model" },
  memory: { icon: Database, color: "border-amber-500/60 text-amber-300", bg: "bg-amber-500/10", label: "Memory" },
  knowledge: { icon: FileText, color: "border-pink-500/60 text-pink-300", bg: "bg-pink-500/10", label: "Knowledge" },
} as const;

export type ResourceNodeType = keyof typeof RESOURCE_NODE_TYPES;

export interface ResourceNodeData extends Record<string, unknown> {
  resourceType: ResourceNodeType;
  label: string;
  detail?: string;
}

export const ResourceNode = memo(({ data, selected }: { data: ResourceNodeData; selected?: boolean }) => {
  const meta = RESOURCE_NODE_TYPES[data.resourceType] ?? RESOURCE_NODE_TYPES.skill;
  const Icon = meta.icon;
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div
        className={`relative flex items-center justify-center rounded-full border-2 ${meta.bg} ${meta.color} bg-card w-14 h-14 shadow-sm transition-all hover:shadow-md ${
          selected ? "ring-2 ring-primary" : ""
        }`}
      >
        <Handle
          type="source"
          position={Position.Top}
          className="!w-2 !h-2 !bg-primary !border-2 !border-background"
        />
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-center max-w-[100px]">
        <div className="text-xs text-foreground font-medium truncate">{data.label}</div>
        {data.detail && (
          <div className="text-[10px] text-muted-foreground truncate">{data.detail}</div>
        )}
      </div>
    </div>
  );
});

ResourceNode.displayName = "ResourceNode";
