/**
 * GAP-01: Workflow save/load — verifies edge sourceNodeId/targetNodeId use
 * NEW DB IDs (not the React Flow string IDs from the client).
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
import { GET, PUT } from '@/app/api/campaigns/[id]/workflow/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }
const mockCampaign = { id: 1, name: 'Test', status: 'draft', userId: 'test-user-id' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/campaigns/[id]/workflow', () => {
  it('returns saved nodes and edges for a campaign', async () => {
    const nodes = [{ id: 10, type: 'email', label: 'Send Email', campaignId: 1 }]
    const edges = [{ id: 20, campaignId: 1, sourceNodeId: 10, targetNodeId: 11 }]

    // Ownership check, then nodes, then edges
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q(nodes) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q(edges) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/campaigns/1/workflow')
    const res = await GET(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.nodes).toEqual(nodes)
    expect(body.edges).toEqual(edges)
  })

  it('returns empty nodes and edges when workflow has not been saved', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/campaigns/1/workflow')
    const res = await GET(req, PARAMS_1)
    const body = await res.json()

    expect(body.nodes).toEqual([])
    expect(body.edges).toEqual([])
  })

  it('returns 404 when campaign does not belong to user', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/campaigns/9999/workflow')
    const res = await GET(req, { params: Promise.resolve({ id: '9999' }) })
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/campaigns/[id]/workflow', () => {
  it('saves nodes and maps React Flow string IDs to new DB integer IDs for edges (GAP-01)', async () => {
    const insertedNode1 = { id: 101, type: 'email', label: 'Email 1', campaignId: 1 }
    const insertedNode2 = { id: 102, type: 'wait', label: 'Wait', campaignId: 1 }

    // Ownership check
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValue(q([insertedNode1, insertedNode2]) as ReturnType<typeof db.select>)

    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)

    vi.mocked(db.insert)
      .mockReturnValueOnce(q([insertedNode1]) as ReturnType<typeof db.insert>)
      .mockReturnValueOnce(q([insertedNode2]) as ReturnType<typeof db.insert>)
      .mockReturnValueOnce(q([{ id: 201 }]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/campaigns/1/workflow', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: [
          { id: 'rf-node-a', data: { type: 'email', label: 'Email 1', config: {} }, position: { x: 0, y: 0 } },
          { id: 'rf-node-b', data: { type: 'wait', label: 'Wait', config: {} }, position: { x: 200, y: 0 } },
        ],
        edges: [
          { source: 'rf-node-a', target: 'rf-node-b' },
        ],
      }),
    })

    const res = await PUT(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    // Verify edges insert was called with DB IDs (101, 102), NOT React Flow string IDs
    const edgeInsert = vi.mocked(db.insert).mock.results[2].value as Record<string, ReturnType<typeof vi.fn>>
    const calledWith = edgeInsert.values.mock.calls[0][0]
    expect(calledWith[0].sourceNodeId).toBe(101)
    expect(calledWith[0].targetNodeId).toBe(102)
  })

  it('clearing all nodes saves empty workflow — no edges inserted', async () => {
    // Ownership check returns valid campaign
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValue(q([]) as ReturnType<typeof db.select>)

    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)

    const req = new NextRequest('http://localhost/api/campaigns/1/workflow', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: [], edges: [] }),
    })
    const res = await PUT(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled()
  })

  it('saves nodes when edges array is empty — no edge insert call', async () => {
    const node = { id: 200, type: 'email', label: 'Email', campaignId: 1 }

    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValue(q([node]) as ReturnType<typeof db.select>)

    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)
    vi.mocked(db.insert).mockReturnValueOnce(q([node]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/campaigns/1/workflow', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: [{ id: 'n1', data: { type: 'email', label: 'Email', config: {} }, position: { x: 0, y: 0 } }],
        edges: [],
      }),
    })
    const res = await PUT(req, PARAMS_1)

    expect(res.status).toBe(200)
    // Only one insert call (the node); no edge insert
    expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(1)
  })

  it('saving twice overwrites previous nodes and edges without duplicates', async () => {
    vi.mocked(db.select).mockReturnValue(q([mockCampaign]) as ReturnType<typeof db.select>)
    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)
    vi.mocked(db.insert).mockReturnValue(q([{ id: 300 }]) as ReturnType<typeof db.insert>)

    const body = JSON.stringify({
      nodes: [{ id: 'x', data: { type: 'email', label: 'E', config: {} }, position: { x: 0, y: 0 } }],
      edges: [],
    })

    const req1 = new NextRequest('http://localhost/api/campaigns/1/workflow', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body,
    })
    const req2 = new NextRequest('http://localhost/api/campaigns/1/workflow', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body,
    })

    const res1 = await PUT(req1, PARAMS_1)
    const res2 = await PUT(req2, PARAMS_1)

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    // delete is called 2x per save (workflowNodes + workflowEdges) = 4 total for 2 saves
    expect(vi.mocked(db.delete)).toHaveBeenCalledTimes(4)
  })
})
