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
      className={`px-4 py-3 rounded-lg border-2 ${colorClass} bg-card min-w-[180px] shadow-lg transition-all hover:shadow-xl hover:scale-105`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-white"
      />
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="font-medium text-foreground text-sm">{data.label}</span>
      </div>
      {data.prospectCount && data.prospectCount > 0 && (
        <Badge variant="secondary" className="mt-2 text-xs bg-primary/20 text-primary">
          {data.prospectCount} prospects
        </Badge>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-white"
      />
    </div>
  );
});

WorkflowNode.displayName = "WorkflowNode";
