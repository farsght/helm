"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FLOW_NODE_TYPES, type FlowNodeType } from "./flow-node";
import { RESOURCE_NODE_TYPES, type ResourceNodeType } from "./resource-node";

interface PaletteItem {
  kind: "flow" | "resource";
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface PaletteSection {
  title: string;
  defaultOpen: boolean;
  items: PaletteItem[];
}

const FLOW_PALETTE: PaletteItem[] = (Object.entries(FLOW_NODE_TYPES) as Array<[FlowNodeType, typeof FLOW_NODE_TYPES[FlowNodeType]]>).map(
  ([type, meta]) => ({
    kind: "flow",
    type,
    label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: meta.icon,
    color: meta.color,
  })
);

const RESOURCE_PALETTE: PaletteItem[] = (Object.entries(RESOURCE_NODE_TYPES) as Array<[ResourceNodeType, typeof RESOURCE_NODE_TYPES[ResourceNodeType]]>).map(
  ([type, meta]) => ({
    kind: "resource",
    type,
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
  })
);

interface PaletteProps {
  sections: ("flow" | "resource")[];
  onDragStart?: (item: PaletteItem) => void;
}

export function Palette({ sections, onDragStart }: PaletteProps) {
  const [query, setQuery] = useState("");
  const filter = (items: PaletteItem[]) => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
  };

  const groups: PaletteSection[] = [];
  if (sections.includes("flow")) {
    groups.push({ title: "Flow Steps", defaultOpen: true, items: filter(FLOW_PALETTE) });
  }
  if (sections.includes("resource")) {
    groups.push({ title: "Resources", defaultOpen: true, items: filter(RESOURCE_PALETTE) });
  }

  return (
    <div className="w-64 shrink-0 border-r border-border bg-card/30 flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes..."
            className="pl-7 h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {groups.map((group) => (
          <PaletteSection key={group.title} section={group} onDragStart={onDragStart} />
        ))}
      </div>
      <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
        Drag a node onto the canvas to add it.
      </div>
    </div>
  );
}

function PaletteSection({ section, onDragStart }: { section: PaletteSection; onDragStart?: (item: PaletteItem) => void }) {
  const [open, setOpen] = useState(section.defaultOpen);
  if (section.items.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground py-1 px-2"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {section.title}
        <span className="ml-auto text-[10px]">{section.items.length}</span>
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {section.items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.kind}-${item.type}`}
                draggable
                onDragStart={(event) => {
                  const payload = JSON.stringify({ kind: item.kind, type: item.type, label: item.label });
                  event.dataTransfer.setData("application/aisdr-palette", payload);
                  event.dataTransfer.effectAllowed = "move";
                  onDragStart?.(item);
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${item.color} bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing text-xs`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-foreground truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { PaletteItem };
