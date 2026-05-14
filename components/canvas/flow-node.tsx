"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Mail, Linkedin, Clock, GitBranch, Bot, ClipboardList,
  Tag, ArrowRightLeft, Square, Sparkles,
} from "lucide-react";

/**
 * FlowNode — rectangle representing a step in the workflow.
 * Renders typed input handle (left), output handle(s) (right).
 * For branching types (condition, ai_decision, ai_agent), renders
 * one right-side handle per branch label.
 */

export const FLOW_NODE_TYPES = {
  email: { icon: Mail, color: "border-blue-500/60 text-blue-300", bg: "bg-blue-500/10" },
  linkedin_message: { icon: Linkedin, color: "border-purple-500/60 text-purple-300", bg: "bg-purple-500/10" },
  linkedin_connection: { icon: Linkedin, color: "border-purple-500/60 text-purple-300", bg: "bg-purple-500/10" },
  linkedin_profile_view: { icon: Linkedin, color: "border-purple-500/60 text-purple-300", bg: "bg-purple-500/10" },
  wait: { icon: Clock, color: "border-amber-500/60 text-amber-300", bg: "bg-amber-500/10" },
  condition: { icon: GitBranch, color: "border-emerald-500/60 text-emerald-300", bg: "bg-emerald-500/10" },
  ai_decision: { icon: Sparkles, color: "border-emerald-500/60 text-emerald-300", bg: "bg-emerald-500/10" },
  ai_agent: { icon: Bot, color: "border-indigo-500/60 text-indigo-300", bg: "bg-indigo-500/10" },
  manual_task: { icon: ClipboardList, color: "border-orange-500/60 text-orange-300", bg: "bg-orange-500/10" },
  tag: { icon: Tag, color: "border-teal-500/60 text-teal-300", bg: "bg-teal-500/10" },
  move_to_campaign: { icon: ArrowRightLeft, color: "border-pink-500/60 text-pink-300", bg: "bg-pink-500/10" },
  end: { icon: Square, color: "border-red-500/60 text-red-300", bg: "bg-red-500/10" },
} as const;

export type FlowNodeType = keyof typeof FLOW_NODE_TYPES;

export interface FlowNodeData extends Record<string, unknown> {
  type: string;
  label: string;
  config?: Record<string, unknown>;
  /** Validation errors targeting this node (rendered as red ring + tooltip). */
  errors?: string[];
}

const BRANCHING_TYPES = new Set(["condition", "ai_decision"]);

/** Get the output port labels for a node — used for both rendering and edge validation. */
function getOutputPorts(data: FlowNodeData): string[] {
  if (data.type === "end") return [];
  if (BRANCHING_TYPES.has(data.type)) return ["yes", "no"];
  if (data.type === "ai_agent") {
    const decisions = (data.config?.decisions as string[] | undefined) ?? [];
    return decisions.length > 0 ? decisions : ["continue"];
  }
  return ["next"];
}

export const FlowNode = memo(({ data, selected }: { data: FlowNodeData; selected?: boolean }) => {
  const meta = FLOW_NODE_TYPES[data.type as FlowNodeType] ?? {
    icon: Square,
    color: "border-border text-muted-foreground",
    bg: "bg-muted",
  };
  const Icon = meta.icon;
  const outputs = getOutputPorts(data);
  const hasErrors = (data.errors?.length ?? 0) > 0;

  return (
    <div
      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 ${meta.bg} ${meta.color} bg-card w-[200px] shadow-sm transition-all hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      } ${hasErrors ? "ring-2 ring-red-500/80" : ""}`}
      title={hasErrors ? data.errors!.join("\n") : undefined}
    >
      {data.type !== "end" || true /* end nodes also need input */ ? (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background"
        />
      ) : null}

      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground text-sm truncate">{data.label}</div>
        <div className="text-xs text-muted-foreground truncate font-mono">{data.type}</div>
      </div>

      {/* Output ports — one per branch. Stacked vertically on the right. */}
      {outputs.map((label, i) => {
        const offset = outputs.length === 1
          ? "50%"
          : `${((i + 1) * 100) / (outputs.length + 1)}%`;
        return (
          <div key={label}>
            <Handle
              type="source"
              position={Position.Right}
              id={label}
              style={{ top: offset }}
              className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background"
            />
            {outputs.length > 1 && (
              <span
                className="absolute right-[-12px] text-[10px] text-muted-foreground translate-x-full whitespace-nowrap pointer-events-none"
                style={{ top: offset, transform: "translate(8px, -50%)" }}
              >
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

FlowNode.displayName = "FlowNode";

export { getOutputPorts };
