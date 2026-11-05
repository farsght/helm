import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

/**
 * Apply a left-to-right dagre layout to nodes. Returns nodes with updated
 * positions. Does not mutate the input.
 *
 * Use when:
 *   - Loading a workflow that has no saved positions
 *   - User clicks "Auto-arrange"
 *   - First load on a brand-new campaign
 */
export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  const NODE_W = 220;
  const NODE_H = 80;
  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}
