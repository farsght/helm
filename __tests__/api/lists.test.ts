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
import { GET, POST } from '@/app/api/lists/route'
import { PUT, DELETE } from '@/app/api/lists/[id]/route'
import {
  GET as GET_MEMBERS,
  POST as ADD_MEMBER,
  DELETE as REMOVE_MEMBER,
} from '@/app/api/lists/[id]/members/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/lists ───────────────────────────────────────────────────────────

describe('GET /api/lists', () => {
  it('returns all lists', async () => {
    const mockLists = [
      { id: 1, name: 'VIP Prospects', type: 'static', memberCount: 0 },
      { id: 2, name: 'Warm Leads', type: 'static', memberCount: 0 },
    ]
    vi.mocked(db.select).mockReturnValue(q(mockLists) as ReturnType<typeof db.select>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(mockLists)
  })

  it('returns empty array when no lists exist', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)

    const res = await GET()
    const body = await res.json()

    expect(body).toEqual([])
  })
})

// ─── POST /api/lists ──────────────────────────────────────────────────────────

describe('POST /api/lists', () => {
  it('creates a list and returns 201', async () => {
    const created = { id: 1, name: 'New List', type: 'static' }
    vi.mocked(db.insert).mockReturnValue(q([created]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New List' }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.name).toBe('New List')
  })
})

// ─── PUT /api/lists/[id] ──────────────────────────────────────────────────────

describe('PUT /api/lists/[id]', () => {
  it('updates the list name and returns the updated record', async () => {
    const updated = { id: 1, name: 'Renamed List' }
    vi.mocked(db.select).mockReturnValueOnce(q([{ id: 1, name: 'Old List', userId: 'test-user-id' }]) as ReturnType<typeof db.select>)
    vi.mocked(db.update).mockReturnValue(q([updated]) as ReturnType<typeof db.update>)

    const req = new NextRequest('http://localhost/api/lists/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed List' }),
    })
    const res = await PUT(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.name).toBe('Renamed List')
  })
})

// ─── DELETE /api/lists/[id] ───────────────────────────────────────────────────

describe('DELETE /api/lists/[id]', () => {
  it('deletes list members first (cascade) then the list, returns success', async () => {
    vi.mocked(db.select).mockReturnValueOnce(q([{ id: 1, name: 'List', userId: 'test-user-id' }]) as ReturnType<typeof db.select>)
    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)

    const req = new NextRequest('http://localhost/api/lists/1', { method: 'DELETE' })
    const res = await DELETE(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
    // Called twice: once for listMembers, once for lists
    expect(vi.mocked(db.delete)).toHaveBeenCalledTimes(2)
  })
})

// ─── GET /api/lists/[id]/members ──────────────────────────────────────────────

describe('GET /api/lists/[id]/members', () => {
  it('returns prospects in the list via join', async () => {
    const members = [
      { id: 1, firstName: 'Alice', lastName: 'A', email: 'a@x.com', company: null, title: null },
    ]
    vi.mocked(db.select).mockReturnValue(q(members) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/lists/1/members')
    const res = await GET_MEMBERS(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(members)
  })

  it('returns 400 for a non-numeric list ID', async () => {
    const req = new NextRequest('http://localhost/api/lists/abc/members')
    const res = await GET_MEMBERS(req, { params: Promise.resolve({ id: 'abc' }) })

    expect(res.status).toBe(400)
  })
})

// ─── POST /api/lists/[id]/members ─────────────────────────────────────────────

describe('POST /api/lists/[id]/members', () => {
  it('adds prospects to the list and returns count of added', async () => {
    // Both prospects are new members
    vi.mocked(db.select)
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)
    vi.mocked(db.insert).mockReturnValue(q([{ id: 1 }]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/lists/1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [10, 20] }),
    })
    const res = await ADD_MEMBER(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.added).toBe(2)
  })

  it('adding an already-member prospect is idempotent — added:0', async () => {
    // Prospect already in list
    vi.mocked(db.select).mockReturnValue(
      q([{ id: 99 }]) as ReturnType<typeof db.select>,
    )

    const req = new NextRequest('http://localhost/api/lists/1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [10] }),
    })
    const res = await ADD_MEMBER(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.added).toBe(0)
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled()
  })
})

// ─── DELETE /api/lists/[id]/members ───────────────────────────────────────────

describe('DELETE /api/lists/[id]/members', () => {
  it('removes a prospect from the list and returns success', async () => {
    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)

    const req = new NextRequest('http://localhost/api/lists/1/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectId: 10 }),
    })
    const res = await REMOVE_MEMBER(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
  })
})
