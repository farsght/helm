"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  UserPlus,
  Eye,
  Clock,
  GitBranch,
  Brain,
  ClipboardList,
  Tag,
  MoveRight,
  StopCircle,
  MessageSquare,
} from "lucide-react";

type IconType = React.ComponentType<{ className?: string }>;

const nodeIcons: Record<string, IconType> = {
  email: Mail,
  linkedin_message: MessageSquare,
  linkedin_connection: UserPlus,
  linkedin_profile_view: Eye,
  wait: Clock,
  condition: GitBranch,
  ai_decision: Brain,
  manual_task: ClipboardList,
  tag: Tag,
  move_to_campaign: MoveRight,
  end: StopCircle,
};

const nodeColors: Record<string, string> = {
  email: "bg-blue-500/10 border-blue-500/50 text-primary",
  linkedin_message: "bg-purple-500/10 border-purple-500/50 text-purple-400",
  linkedin_connection: "bg-green-500/10 border-green-500/50 text-green-400",
  linkedin_profile_view: "bg-cyan-500/10 border-cyan-500/50 text-cyan-400",
  wait: "bg-yellow-500/10 border-yellow-500/50 text-yellow-400",
  condition: "bg-orange-500/10 border-orange-500/50 text-orange-400",
  ai_decision: "bg-pink-500/10 border-pink-500/50 text-pink-400",
  manual_task: "bg-indigo-500/10 border-indigo-500/50 text-indigo-400",
  tag: "bg-teal-500/10 border-teal-500/50 text-teal-400",
  move_to_campaign: "bg-violet-500/10 border-violet-500/50 text-violet-400",
  end: "bg-red-500/10 border-red-500/50 text-red-400",
};

interface WorkflowNodeData {
  type: string;
  label: string;
  prospectCount?: number;
}

export const WorkflowNode = memo(({ data }: { data: WorkflowNodeData }) => {
  const Icon = nodeIcons[data.type] || Mail;
  const colorClass = nodeColors[data.type] || "bg-muted border-border text-muted-foreground";

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-md border-2 ${colorClass} bg-card w-[120px] h-[65px] shadow-sm transition-all hover:shadow-md`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background"
      />
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-medium text-foreground text-[11px] text-center leading-tight line-clamp-2 break-words">
        {data.label}
      </span>
      {typeof data.prospectCount === "number" && data.prospectCount > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1.5 -right-1.5 text-[10px] h-4 px-1.5 bg-primary text-primary-foreground"
        >
          {data.prospectCount}
        </Badge>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background"
      />
    </div>
  );
});

WorkflowNode.displayName = "WorkflowNode";
