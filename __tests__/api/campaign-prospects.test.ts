/**
 * GAP-04: Campaign prospect enrollment — POST/DELETE for campaign enrollments
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
import { POST, DELETE } from '@/app/api/campaigns/[id]/prospects/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }
const mockCampaign = { id: 1, name: 'Test', status: 'active', userId: 'test-user-id' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/campaigns/[id]/prospects', () => {
  it('enrolls each prospect with status=pending and returns count', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>) // ownership
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)              // existing check p1
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)              // existing check p2
    vi.mocked(db.insert).mockReturnValue(q([{ id: 1 }]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/campaigns/1/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [10, 20] }),
    })
    const res = await POST(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.enrolled).toBe(2)
    expect(body.total).toBe(2)
  })

  it('enroll via listId fetches list members then enrolls them', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)                // ownership
      .mockReturnValueOnce(q([{ prospectId: 5 }, { prospectId: 6 }]) as ReturnType<typeof db.select>) // listMembers
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)                            // existing p5
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)                            // existing p6
    vi.mocked(db.insert).mockReturnValue(q([{ id: 1 }]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/campaigns/1/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId: 3 }),
    })
    const res = await POST(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.enrolled).toBe(2)
  })

  it('with both prospectIds and listId: deduplicates and enrolls unique set', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([{ prospectId: 20 }, { prospectId: 30 }]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>) // existing check p20
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>) // existing check p30
    vi.mocked(db.insert).mockReturnValue(q([{ id: 1 }]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/campaigns/1/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [20], listId: 3 }),
    })
    const res = await POST(req, PARAMS_1)
    const body = await res.json()

    // Deduplicated: [20, 30] — 2 unique, both enrolled
    expect(body.total).toBe(2)
    expect(body.enrolled).toBe(2)
  })

  it('re-enrolling already-enrolled prospect skips them — enrolled:0, total:1', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockCampaign]) as ReturnType<typeof db.select>)  // ownership
      .mockReturnValue(q([{ id: 99 }]) as ReturnType<typeof db.select>)         // already enrolled

    const req = new NextRequest('http://localhost/api/campaigns/1/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [10] }),
    })
    const res = await POST(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.enrolled).toBe(0)
    expect(body.total).toBe(1)
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled()
  })

  it('returns 400 when no prospectIds and no listId provided', async () => {
    vi.mocked(db.select).mockReturnValue(q([mockCampaign]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/campaigns/1/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req, PARAMS_1)
    expect(res.status).toBe(400)
  })

  it('returns 404 when campaign does not belong to user', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/campaigns/9999/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [1] }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: '9999' }) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/campaigns/[id]/prospects', () => {
  it('removes the enrollment and returns { success: true }', async () => {
    vi.mocked(db.select).mockReturnValue(q([mockCampaign]) as ReturnType<typeof db.select>)
    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)

    const req = new NextRequest('http://localhost/api/campaigns/1/prospects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectId: 10 }),
    })
    const res = await DELETE(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
  })
})
