// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { topoSortGeneric, getExecutor, registerExecutor } from '@/lib/pipeline-engine';

// Minimal stand-in for DbPipelineNode/Edge (topoSortGeneric is generic).
type N = { id: number; type?: string };
type E = { sourceNodeId: number; targetNodeId: number };

describe('topoSortGeneric', () => {
  it('orders a linear chain', () => {
    const nodes: N[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const edges: E[] = [
      { sourceNodeId: 1, targetNodeId: 2 },
      { sourceNodeId: 2, targetNodeId: 3 },
    ];
    const sorted = topoSortGeneric(nodes, edges);
    expect(sorted.map((n) => n.id)).toEqual([1, 2, 3]);
  });

  it('handles a fan-out + fan-in diamond', () => {
    // 1 → 2,3 → 4
    const nodes: N[] = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const edges: E[] = [
      { sourceNodeId: 1, targetNodeId: 2 },
      { sourceNodeId: 1, targetNodeId: 3 },
      { sourceNodeId: 2, targetNodeId: 4 },
      { sourceNodeId: 3, targetNodeId: 4 },
    ];
    const sorted = topoSortGeneric(nodes, edges);
    expect(sorted[0]?.id).toBe(1);
    expect(sorted.at(-1)?.id).toBe(4);
    // 2 and 3 in the middle, order indeterminate but both present
    expect(sorted.slice(1, 3).map((n) => n.id).sort()).toEqual([2, 3]);
  });

  it('orders multiple roots by id for determinism', () => {
    // Two disjoint chains: 1→2 and 3→4
    const nodes: N[] = [{ id: 3 }, { id: 1 }, { id: 4 }, { id: 2 }];
    const edges: E[] = [
      { sourceNodeId: 1, targetNodeId: 2 },
      { sourceNodeId: 3, targetNodeId: 4 },
    ];
    const sorted = topoSortGeneric(nodes, edges);
    // Roots are 1 and 3 — should appear in id order (1 before 3).
    const rootIndices = [sorted.findIndex((n) => n.id === 1), sorted.findIndex((n) => n.id === 3)];
    expect(rootIndices[0]).toBeLessThan(rootIndices[1]);
  });

  it('throws on a cycle', () => {
    const nodes: N[] = [{ id: 1 }, { id: 2 }];
    const edges: E[] = [
      { sourceNodeId: 1, targetNodeId: 2 },
      { sourceNodeId: 2, targetNodeId: 1 },
    ];
    expect(() => topoSortGeneric(nodes, edges)).toThrow(/cycle/);
  });

  it('handles a single isolated node', () => {
    const nodes: N[] = [{ id: 42 }];
    const sorted = topoSortGeneric(nodes, []);
    expect(sorted.map((n) => n.id)).toEqual([42]);
  });

  it('ignores edges referencing unknown nodes', () => {
    const nodes: N[] = [{ id: 1 }, { id: 2 }];
    const edges: E[] = [
      { sourceNodeId: 1, targetNodeId: 2 },
      { sourceNodeId: 99, targetNodeId: 100 }, // dangling
    ];
    const sorted = topoSortGeneric(nodes, edges);
    expect(sorted.map((n) => n.id)).toEqual([1, 2]);
  });
});

describe('executor registry', () => {
  it('registers and retrieves an executor', async () => {
    const fn = async () => [{ x: 1 }];
    registerExecutor('test_node_type', fn);
    const got = getExecutor('test_node_type');
    expect(got).toBe(fn);
  });

  it('ships passthrough executors for the 15 existing UI node types', () => {
    const types = [
      'source_dataset',
      'map_fields',
      'filter',
      'clean',
      'deduplicate',
      'enrich',
      'ai_classify',
      'split',
      'run_notebook',
      'promote_prospects',
      'promote_companies',
      'promote_contacts',
      'promote_deals',
      'promote_segment',
    ];
    for (const t of types) {
      expect(getExecutor(t), `executor missing for ${t}`).toBeDefined();
    }
  });

  it('returns undefined for an unknown node type', () => {
    expect(getExecutor('nope_does_not_exist')).toBeUndefined();
  });
});
