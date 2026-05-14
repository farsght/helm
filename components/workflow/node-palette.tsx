"use client";

import {
  Mail,
  MessageSquare,
  UserPlus,
  Eye,
  Clock,
  GitBranch,
  Brain,
  ClipboardList,
  Tag,
  MoveRight,
  StopCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const nodeTypes = [
  { type: "email", label: "Email", icon: Mail },
  { type: "linkedin_message", label: "LinkedIn Message", icon: MessageSquare },
  { type: "linkedin_connection", label: "LinkedIn Connection", icon: UserPlus },
  { type: "linkedin_profile_view", label: "LinkedIn Profile View", icon: Eye },
  { type: "wait", label: "Wait", icon: Clock },
  { type: "condition", label: "Condition", icon: GitBranch },
  { type: "ai_decision", label: "AI Decision", icon: Brain },
  { type: "manual_task", label: "Manual Task", icon: ClipboardList },
  { type: "tag", label: "Tag", icon: Tag },
  { type: "move_to_campaign", label: "Move to Campaign", icon: MoveRight },
  { type: "end", label: "End", icon: StopCircle },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card className="absolute left-4 top-4 z-10 w-64 bg-card border-border shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-foreground">Add Step</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-1 p-4 pt-0">
            {nodeTypes.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-accent cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-primary"
              >
                <node.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{node.label}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
