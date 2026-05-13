/**
 * End-to-end integration: GAP-01
 * Simulate: save workflow with 5 nodes + 4 edges → reload → verify edges
 * reference correct DB node IDs (not React Flow string IDs).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { q } from '../helpers/db-mock'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { db } from '@/db'
import { PUT, GET } from '@/app/api/campaigns/[id]/workflow/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }
const mockCampaign = { id: 1, name: 'Test', status: 'active', userId: 'test-user-id' }

beforeEach(() => {
  vi.clearAllMocks()
})

const rfNodes = [
  { id: 'rf-a', data: { type: 'email', label: 'Email 1', config: { subject: 'Hi', body: 'Hello' } }, position: { x: 0, y: 0 } },
  { id: 'rf-b', data: { type: 'wait', label: 'Wait 2 days', config: { duration: 48 } }, position: { x: 200, y: 0 } },
  { id: 'rf-c', data: { type: 'condition', label: 'Opened?', config: { conditionType: 'message_opened' } }, position: { x: 400, y: 0 } },
  { id: 'rf-d', data: { type: 'email', label: 'Email 2', config: { subject: 'Follow up', body: 'Hey again' } }, position: { x: 600, y: 0 } },
  { id: 'rf-e', data: { type: 'end', label: 'End', config: {} }, position: { x: 800, y: 0 } },
]

const rfEdges = [
  { source: 'rf-a', target: 'rf-b' },
  { source: 'rf-b', target: 'rf-c' },
  { source: 'rf-c', target: 'rf-d', label: 'yes' },
  { source: 'rf-c', target: 'rf-e', label: 'no' },
]

describe('Workflow save → load (integration)', () => {
  it('saves 5 nodes and 4 edges — edges reference new DB IDs, not RF string IDs', async () => {
    const dbNodes = rfNodes.map((n, i) => ({
      id: 101 + i, type: n.data.type, label: n.data.label, campaignId: 1,
    }))

    // Ownership check
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValue(q(dbNodes) as ReturnType<typeof db.select>) // select new nodes

    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)

    let insertIdx = 0
    vi.mocked(db.insert).mockImplementation(() => {
      const node = dbNodes[insertIdx] ?? { id: 999 }
      insertIdx++
      return q([node]) as ReturnType<typeof db.insert>
    })

    const saveReq = new NextRequest('http://localhost/api/campaigns/1/workflow', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: rfNodes, edges: rfEdges }),
    })
    const saveRes = await PUT(saveReq, PARAMS_1)
    expect(saveRes.status).toBe(200)

    // Node insert calls: indices 0-4; Edge insert call: index 5
    const edgeInsertMock = vi.mocked(db.insert).mock.results[5]?.value as Record<string, ReturnType<typeof vi.fn>>
    expect(edgeInsertMock).toBeDefined()

    const edgeValues: Array<{ sourceNodeId: number; targetNodeId: number; label?: string }> =
      edgeInsertMock.values.mock.calls[0][0]

    expect(edgeValues[0].sourceNodeId).toBe(101) // rf-a → 101
    expect(edgeValues[0].targetNodeId).toBe(102) // rf-b → 102
    expect(edgeValues[1].sourceNodeId).toBe(102)
    expect(edgeValues[1].targetNodeId).toBe(103)
    expect(edgeValues[2].sourceNodeId).toBe(103)
    expect(edgeValues[2].targetNodeId).toBe(104)
    expect(edgeValues[2].label).toBe('yes')
    expect(edgeValues[3].sourceNodeId).toBe(103)
    expect(edgeValues[3].targetNodeId).toBe(105)
    expect(edgeValues[3].label).toBe('no')
  })

  it('reloading workflow returns nodes and edges stored by the DB', async () => {
    const savedNodes = [
      { id: 101, type: 'email', label: 'Email 1', campaignId: 1 },
      { id: 102, type: 'end', label: 'End', campaignId: 1 },
    ]
    const savedEdges = [
      { id: 201, campaignId: 1, sourceNodeId: 101, targetNodeId: 102, label: null },
    ]

    // Ownership check, then nodes, then edges
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q(savedNodes) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q(savedEdges) as ReturnType<typeof db.select>)

    const loadReq = new NextRequest('http://localhost/api/campaigns/1/workflow')
    const loadRes = await GET(loadReq, PARAMS_1)
    const body = await loadRes.json()

    expect(loadRes.status).toBe(200)
    expect(body.nodes).toHaveLength(2)
    expect(body.edges).toHaveLength(1)
    expect(body.edges[0].sourceNodeId).toBe(101)
    expect(body.edges[0].targetNodeId).toBe(102)
  })

  it('nodes use integer DB IDs in the loaded response, not the original RF string IDs', async () => {
    const savedNodes = rfNodes.map((n, i) => ({
      id: 101 + i, type: n.data.type, label: n.data.label, campaignId: 1,
    }))
    const savedEdges = [{ id: 201, campaignId: 1, sourceNodeId: 101, targetNodeId: 102, label: null }]

    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q(savedNodes) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q(savedEdges) as ReturnType<typeof db.select>)

    const loadReq = new NextRequest('http://localhost/api/campaigns/1/workflow')
    const loadRes = await GET(loadReq, PARAMS_1)
    const body = await loadRes.json()

    body.nodes.forEach((node: { id: number }) => {
      expect(typeof node.id).toBe('number')
      expect(node.id).toBeGreaterThan(0)
    })
  })
})
