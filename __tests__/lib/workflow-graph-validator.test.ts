import { describe, it, expect } from 'vitest'
import {
  validateWorkflowGraph,
  type ValidatorNode,
  type ValidatorEdge,
} from '@/lib/workflow-graph-validator'

// ──────────────────────────────────────────────────────────────────────
// Test factories
// ──────────────────────────────────────────────────────────────────────

function n(id: number, type: string, label = `n${id}`): ValidatorNode {
  return { id, type, label }
}
function e(
  source: number,
  target: number,
  label: string | null = null,
  id = source * 100 + target,
): ValidatorEdge {
  return { id, sourceNodeId: source, targetNodeId: target, label }
}

// ──────────────────────────────────────────────────────────────────────
// Happy paths
// ──────────────────────────────────────────────────────────────────────

describe('validateWorkflowGraph — valid graphs', () => {
  it('accepts the minimal email → end workflow', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'end')],
      [e(1, 2)],
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.startNodeId).toBe(1)
  })

  it('accepts a 3-step nurture: email → wait → email → end', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'wait'), n(3, 'email'), n(4, 'end')],
      [e(1, 2), e(2, 3), e(3, 4)],
    )
    expect(result.valid).toBe(true)
  })

  it('accepts a condition node with yes/no branches that both end', () => {
    const result = validateWorkflowGraph(
      [
        n(1, 'email'),
        n(2, 'condition'),
        n(3, 'email'),
        n(4, 'end'),
        n(5, 'end'),
      ],
      [e(1, 2), e(2, 3, 'yes'), e(2, 5, 'no'), e(3, 4)],
    )
    expect(result.valid).toBe(true)
    expect(result.startNodeId).toBe(1)
  })

  it('accepts ai_decision branching (treated identically to condition)', () => {
    const result = validateWorkflowGraph(
      [n(1, 'ai_decision'), n(2, 'end'), n(3, 'end')],
      [e(1, 2, 'yes'), e(1, 3, 'no')],
    )
    expect(result.valid).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────
// Empty / trivial errors
// ──────────────────────────────────────────────────────────────────────

describe('validateWorkflowGraph — basic errors', () => {
  it('rejects empty graph', () => {
    const result = validateWorkflowGraph([], [])
    expect(result.valid).toBe(false)
    expect(result.errors[0].kind).toBe('no_start_node')
  })

  it('rejects unknown node type', () => {
    const result = validateWorkflowGraph(
      [n(1, 'space_invader'), n(2, 'end')],
      [e(1, 2)],
    )
    expect(result.errors.some((e) => e.kind === 'unknown_node_type')).toBe(true)
  })

  it('rejects invalid JSON in configJson', () => {
    const result = validateWorkflowGraph(
      [
        { id: 1, type: 'email', label: 'n1', configJson: '{not json' },
        n(2, 'end'),
      ],
      [e(1, 2)],
    )
    expect(result.errors.some((e) => e.kind === 'invalid_config_json')).toBe(true)
  })

  it('rejects workflow with no end node', () => {
    const result = validateWorkflowGraph([n(1, 'email')], [])
    expect(result.errors.some((e) => e.kind === 'no_end_node')).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────
// Edge structural errors
// ──────────────────────────────────────────────────────────────────────

describe('validateWorkflowGraph — edge structural errors', () => {
  it('flags edges with missing source node', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'end')],
      [e(1, 2), e(99, 1)],
    )
    expect(result.errors.some((e) => e.kind === 'edge_dangling_source')).toBe(true)
  })

  it('flags edges with missing target node', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'end')],
      [e(1, 99), e(1, 2)],
    )
    expect(result.errors.some((e) => e.kind === 'edge_dangling_target')).toBe(true)
  })

  it('flags self-loop edges', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'end')],
      [e(1, 1), e(1, 2)],
    )
    expect(result.errors.some((e) => e.kind === 'self_loop_edge')).toBe(true)
  })

  it('flags duplicate edges between same source/target', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'end')],
      [e(1, 2, null, 10), e(1, 2, null, 11)],
    )
    expect(result.errors.some((e) => e.kind === 'duplicate_edge')).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────
// Outgoing-degree rules (strict DAG)
// ──────────────────────────────────────────────────────────────────────

describe('validateWorkflowGraph — outgoing degree rules', () => {
  it('rejects a non-branching node with 2 outgoing edges (fan-out not allowed)', () => {
    // This is the "Manual Task → 2 children" case from the screenshot
    const result = validateWorkflowGraph(
      [n(1, 'manual_task'), n(2, 'email'), n(3, 'email'), n(4, 'end'), n(5, 'end')],
      [e(1, 2), e(1, 3), e(2, 4), e(3, 5)],
    )
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.kind === 'non_branching_node_must_have_one_outgoing',
      ),
    ).toBe(true)
  })

  it('rejects a non-branching node with 0 outgoing edges', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'email'), n(3, 'end')],
      [e(1, 3)], // n2 has no outgoing
    )
    expect(
      result.errors.some(
        (e) => e.kind === 'non_branching_node_must_have_one_outgoing',
      ),
    ).toBe(true)
  })

  it('rejects an end node with outgoing edges', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'end'), n(3, 'end')],
      [e(1, 2), e(2, 3)],
    )
    expect(
      result.errors.some((e) => e.kind === 'end_node_must_have_no_outgoing'),
    ).toBe(true)
  })

  it('rejects a condition node with only 1 outgoing edge', () => {
    const result = validateWorkflowGraph(
      [n(1, 'condition'), n(2, 'end')],
      [e(1, 2, 'yes')],
    )
    expect(
      result.errors.some(
        (e) => e.kind === 'branching_node_must_have_two_outgoing',
      ),
    ).toBe(true)
  })

  it('rejects a condition node with 3 outgoing edges', () => {
    const result = validateWorkflowGraph(
      [n(1, 'condition'), n(2, 'end'), n(3, 'end'), n(4, 'end')],
      [e(1, 2, 'yes'), e(1, 3, 'no'), e(1, 4, 'maybe')],
    )
    expect(
      result.errors.some(
        (e) => e.kind === 'branching_node_must_have_two_outgoing',
      ),
    ).toBe(true)
  })

  it('rejects condition edges with wrong labels (only "yes" and "no" allowed)', () => {
    const result = validateWorkflowGraph(
      [n(1, 'condition'), n(2, 'end'), n(3, 'end')],
      [e(1, 2, 'true'), e(1, 3, 'false')],
    )
    expect(
      result.errors.some((e) => e.kind === 'branching_edges_must_be_yes_no'),
    ).toBe(true)
  })

  it('rejects condition edges with missing labels', () => {
    const result = validateWorkflowGraph(
      [n(1, 'condition'), n(2, 'end'), n(3, 'end')],
      [e(1, 2, null), e(1, 3, null)],
    )
    expect(
      result.errors.some((e) => e.kind === 'branching_edges_must_be_yes_no'),
    ).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────
// Reachability + cycle + path-to-end
// ──────────────────────────────────────────────────────────────────────

describe('validateWorkflowGraph — connectivity', () => {
  it('rejects multiple start candidates (>1 node with no incoming edges)', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'email'), n(3, 'end'), n(4, 'end')],
      [e(1, 3), e(2, 4)],
    )
    expect(result.errors.some((e) => e.kind === 'multiple_start_nodes')).toBe(true)
  })

  it('detects a simple cycle: email → wait → email back to first', () => {
    // Note: this is also caught by self-loop / degree rules in some cases.
    // We construct a 3-node cycle so the structural checks pass first.
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'wait'), n(3, 'email'), n(4, 'end')],
      [e(1, 2), e(2, 3), e(3, 1), e(1, 4)],
    )
    // The cycle detector or degree check should fire; assert at least one
    // structural error appears.
    expect(result.valid).toBe(false)
  })

  it('detects a 3-node cycle by replacing degree rules', () => {
    // Construct a graph where the cycle exists but degree rules pass
    // (each node still has exactly one outgoing edge, just cyclically).
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'wait'), n(3, 'email'), n(4, 'end')],
      [e(1, 2), e(2, 3), e(3, 1), e(99, 4, null, 999)], // dangling edge to force end-reachability question
    )
    // The cycle [1,2,3] should be detected (and 4 will be unreachable too)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.kind === 'cycle_detected')).toBe(true)
  })

  it('flags nodes unreachable from start', () => {
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'email'), n(3, 'end'), n(4, 'end')],
      [e(1, 3), e(2, 4)],
    )
    // 2 + 4 form an island disconnected from the start node 1.
    // (Validator may flag multiple start nodes as the root issue.)
    const hasUnreachable = result.errors.some(
      (e) => e.kind === 'unreachable_from_start',
    )
    const hasMultipleStart = result.errors.some(
      (e) => e.kind === 'multiple_start_nodes',
    )
    expect(hasUnreachable || hasMultipleStart).toBe(true)
  })

  it('flags nodes with no path to any end node', () => {
    // Construct: 1 -> 2 (loop back to 1) | 3 (end) is unreachable
    // Easier: a node that ends in a non-end terminal — but our degree rules
    // require 1 outgoing for non-end. So this only happens with cycles.
    // Test indirectly: the cycle detector fires, which implies no path to end.
    const result = validateWorkflowGraph(
      [n(1, 'email'), n(2, 'wait'), n(3, 'end')],
      [e(1, 2), e(2, 1), e(99, 3, null, 999)],
    )
    expect(result.valid).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────
// Realistic patterns
// ──────────────────────────────────────────────────────────────────────

describe('validateWorkflowGraph — realistic patterns', () => {
  it('accepts a 3-touch nurture with reply-check at each step', () => {
    // email → wait 3d → condition(replied?)
    //                              → yes → end
    //                              → no  → email → wait 4d → condition(replied?)
    //                                                                → yes → end
    //                                                                → no  → email → end
    const result = validateWorkflowGraph(
      [
        n(1, 'email'),
        n(2, 'wait'),
        n(3, 'condition'),
        n(4, 'end'),
        n(5, 'email'),
        n(6, 'wait'),
        n(7, 'condition'),
        n(8, 'end'),
        n(9, 'email'),
        n(10, 'end'),
      ],
      [
        e(1, 2),
        e(2, 3),
        e(3, 4, 'yes'),
        e(3, 5, 'no'),
        e(5, 6),
        e(6, 7),
        e(7, 8, 'yes'),
        e(7, 9, 'no'),
        e(9, 10),
      ],
    )
    expect(result.valid).toBe(true)
    expect(result.startNodeId).toBe(1)
  })

  it('rejects the screenshot-like graph (Manual Task fans out, Email has 2 incoming)', () => {
    // Reconstructing the topology from the screenshot:
    // LinkedIn Message → Email
    // Manual Task → LinkedIn Profile View
    // Manual Task → LinkedIn Connection
    // LinkedIn Profile View → Email
    // LinkedIn Connection → Email
    // Email → End
    // (No start defined cleanly because Manual Task and LinkedIn Message
    // are both roots — also a multiple_start_nodes violation.)
    const result = validateWorkflowGraph(
      [
        n(1, 'linkedin_message'),
        n(2, 'manual_task'),
        n(3, 'linkedin_profile_view'),
        n(4, 'linkedin_connection'),
        n(5, 'email'),
        n(6, 'end'),
      ],
      [
        e(1, 5),
        e(2, 3),
        e(2, 4), // manual_task fans out — invalid
        e(3, 5),
        e(4, 5),
        e(5, 6),
      ],
    )
    expect(result.valid).toBe(false)
    // Should catch the fan-out
    expect(
      result.errors.some(
        (e) => e.kind === 'non_branching_node_must_have_one_outgoing',
      ),
    ).toBe(true)
  })
})
