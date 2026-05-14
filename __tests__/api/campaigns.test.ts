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
import { GET, POST } from '@/app/api/campaigns/route'
import {
  GET as GET_ONE,
  PUT,
  DELETE,
} from '@/app/api/campaigns/[id]/route'
import { POST as ACTIVATE } from '@/app/api/campaigns/[id]/activate/route'
import { POST as PAUSE } from '@/app/api/campaigns/[id]/pause/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }
const mockCampaign = { id: 1, name: 'Test', status: 'draft', userId: 'test-user-id' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/campaigns', () => {
  it('returns an array of campaigns from the database (filtered by userId)', async () => {
    const mockCampaigns = [
      { id: 1, name: 'Camp A', status: 'draft', prospectCount: 0, stepCount: 0 },
      { id: 2, name: 'Camp B', status: 'active', prospectCount: 0, stepCount: 0 },
    ]
    vi.mocked(db.select).mockReturnValue(q(mockCampaigns) as ReturnType<typeof db.select>)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual(mockCampaigns)
  })

  it('returns an empty array when no campaigns exist for this user', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })
})

describe('POST /api/campaigns', () => {
  it('creates campaign with defaults: status=draft, returns 201', async () => {
    const created = { id: 1, name: 'Test', status: 'draft' }
    vi.mocked(db.insert).mockReturnValue(q([created]) as ReturnType<typeof db.insert>)
    const req = new NextRequest('http://localhost/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.name).toBe('Test')
    expect(body.status).toBe('draft')
  })

  it('passes provided fields through to the DB insert', async () => {
    const created = { id: 2, name: 'Outreach Q1', status: 'draft', description: 'desc', segmentId: 5 }
    vi.mocked(db.insert).mockReturnValue(q([created]) as ReturnType<typeof db.insert>)
    const req = new NextRequest('http://localhost/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Outreach Q1', description: 'desc', segmentId: 5 }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.segmentId).toBe(5)
    expect(body.description).toBe('desc')
  })
})

describe('PUT /api/campaigns/[id]', () => {
  it('updates only the provided fields and returns the updated campaign', async () => {
    const updated = { id: 1, name: 'Renamed', status: 'draft', description: null }
    // Ownership check select, then update
    vi.mocked(db.select).mockReturnValue(q([mockCampaign]) as ReturnType<typeof db.select>)
    vi.mocked(db.update).mockReturnValue(q([updated]) as ReturnType<typeof db.update>)
    const req = new NextRequest('http://localhost/api/campaigns/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    })
    const res = await PUT(req, PARAMS_1)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.name).toBe('Renamed')
  })

  it('returns 404 when campaign does not belong to the current user', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)
    const req = new NextRequest('http://localhost/api/campaigns/9999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: '9999' }) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/campaigns/[id]', () => {
  it('deletes a campaign and returns { success: true }', async () => {
    vi.mocked(db.select).mockReturnValue(q([mockCampaign]) as ReturnType<typeof db.select>)
    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)
    const req = new NextRequest('http://localhost/api/campaigns/1', { method: 'DELETE' })
    const res = await DELETE(req, PARAMS_1)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
  })

  it('returns 404 when campaign not found for this user', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)
    const req = new NextRequest('http://localhost/api/campaigns/9999', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: '9999' }) })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/campaigns/[id]', () => {
  it('returns the campaign when found', async () => {
    vi.mocked(db.select).mockReturnValue(q([mockCampaign]) as ReturnType<typeof db.select>)
    const req = new NextRequest('http://localhost/api/campaigns/1')
    const res = await GET_ONE(req, PARAMS_1)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual(mockCampaign)
  })

  it('returns 404 when no campaign found for this user', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)
    const req = new NextRequest('http://localhost/api/campaigns/9999')
    const res = await GET_ONE(req, { params: Promise.resolve({ id: '9999' }) })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/campaigns/[id]/activate', () => {
  it('sets campaign status to active and returns success', async () => {
    const activated = { id: 1, name: 'Test', status: 'active', userId: 'test-user-id' }
    vi.mocked(db.update).mockReturnValue(q([activated]) as ReturnType<typeof db.update>)
    const req = new NextRequest('http://localhost/api/campaigns/1/activate', { method: 'POST' })
    const res = await ACTIVATE(req, PARAMS_1)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.campaign.status).toBe('active')
  })

  it('activating an already-active campaign is idempotent — returns success', async () => {
    const alreadyActive = { id: 1, name: 'Test', status: 'active', userId: 'test-user-id' }
    vi.mocked(db.update).mockReturnValue(q([alreadyActive]) as ReturnType<typeof db.update>)
    const req = new NextRequest('http://localhost/api/campaigns/1/activate', { method: 'POST' })
    const res = await ACTIVATE(req, PARAMS_1)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 404 when campaign does not exist', async () => {
    vi.mocked(db.update).mockReturnValue(q([]) as ReturnType<typeof db.update>)
    const req = new NextRequest('http://localhost/api/campaigns/9999/activate', { method: 'POST' })
    const res = await ACTIVATE(req, { params: Promise.resolve({ id: '9999' }) })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/campaigns/[id]/pause', () => {
  it('sets campaign status to paused and returns success', async () => {
    const paused = { id: 1, name: 'Test', status: 'paused', userId: 'test-user-id' }
    vi.mocked(db.update).mockReturnValue(q([paused]) as ReturnType<typeof db.update>)
    const req = new NextRequest('http://localhost/api/campaigns/1/pause', { method: 'POST' })
    const res = await PAUSE(req, PARAMS_1)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.campaign.status).toBe('paused')
  })

  it('returns 404 when campaign does not exist', async () => {
    vi.mocked(db.update).mockReturnValue(q([]) as ReturnType<typeof db.update>)
    const req = new NextRequest('http://localhost/api/campaigns/9999/pause', { method: 'POST' })
    const res = await PAUSE(req, { params: Promise.resolve({ id: '9999' }) })
    expect(res.status).toBe(404)
  })
})
