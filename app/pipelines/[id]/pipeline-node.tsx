"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

const NODE_COLORS: Record<string, string> = {
  source_dataset: "bg-blue-500/10 border-blue-500/50 text-blue-400",
  map_fields: "bg-purple-500/10 border-purple-500/50 text-purple-400",
  filter: "bg-orange-500/10 border-orange-500/50 text-orange-400",
  clean: "bg-teal-500/10 border-teal-500/50 text-teal-400",
  deduplicate: "bg-cyan-500/10 border-cyan-500/50 text-cyan-400",
  enrich: "bg-indigo-500/10 border-indigo-500/50 text-indigo-400",
  ai_classify: "bg-pink-500/10 border-pink-500/50 text-pink-400",
  split: "bg-yellow-500/10 border-yellow-500/50 text-yellow-400",
  run_notebook: "bg-violet-500/10 border-violet-500/50 text-violet-400",
  promote_prospects: "bg-green-500/10 border-green-500/50 text-green-400",
  promote_companies: "bg-green-500/10 border-green-500/50 text-green-400",
  promote_contacts: "bg-green-500/10 border-green-500/50 text-green-400",
  promote_deals: "bg-green-500/10 border-green-500/50 text-green-400",
  promote_segment: "bg-green-500/10 border-green-500/50 text-green-400",
};

interface PipelineNodeData {
  type: string;
  label: string;
}

export const PipelineNode = memo(({ data }: { data: PipelineNodeData }) => {
  const colorClass = NODE_COLORS[data.type] ?? "bg-muted border-border text-muted-foreground";
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-md border-2 ${colorClass} bg-card w-[130px] h-[58px] shadow-sm transition-all hover:shadow-md`}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background" />
      <span className="font-medium text-foreground text-[11px] text-center leading-tight line-clamp-2 break-words">
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background" />
    </div>
  );
});

PipelineNode.displayName = "PipelineNode";
