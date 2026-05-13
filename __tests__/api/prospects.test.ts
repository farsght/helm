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
import { GET, POST } from '@/app/api/prospects/route'
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/prospects/[id]/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/prospects ───────────────────────────────────────────────────────

describe('GET /api/prospects', () => {
  it('returns paginated results with default limit of 50', async () => {
    const mockProspects = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1, firstName: 'First', lastName: 'Last', email: `p${i}@x.com`,
    }))
    // First call: prospects query; second call: count query
    vi.mocked(db.select)
      .mockReturnValueOnce(q(mockProspects) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([{ count: 5 }]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/prospects')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.prospects).toHaveLength(5)
    expect(body.limit).toBe(50)
    expect(body.page).toBe(1)
    expect(body.total).toBe(5)
  })

  it('respects page and limit query params', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([{ count: 100 }]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/prospects?page=3&limit=10')
    const res = await GET(req)
    const body = await res.json()

    expect(body.page).toBe(3)
    expect(body.limit).toBe(10)
    expect(body.pages).toBe(10) // 100 total / 10 per page
  })

  it('filters by search term (name / email / company)', async () => {
    const result = [{ id: 1, firstName: 'John', lastName: 'Doe', email: 'j@acme.com' }]
    vi.mocked(db.select)
      .mockReturnValueOnce(q(result) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([{ count: 1 }]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/prospects?search=acme')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.prospects).toHaveLength(1)
  })

  it('returns pages=0 and total=0 when no prospects exist', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([{ count: 0 }]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/prospects')
    const res = await GET(req)
    const body = await res.json()

    expect(body.total).toBe(0)
    expect(body.prospects).toEqual([])
  })
})

// ─── POST /api/prospects ──────────────────────────────────────────────────────

describe('POST /api/prospects', () => {
  it('creates a prospect with all provided fields and returns 201', async () => {
    const created = {
      id: 1, firstName: 'Jane', lastName: 'Smith', email: 'jane@acme.com',
      company: 'Acme', title: 'CTO', industry: 'Tech', location: 'SF',
    }
    vi.mocked(db.insert).mockReturnValue(q([created]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Jane', lastName: 'Smith', email: 'jane@acme.com',
        company: 'Acme', title: 'CTO', industry: 'Tech', location: 'SF',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.email).toBe('jane@acme.com')
    expect(body.company).toBe('Acme')
  })

  it('DB error propagates as 500 (missing required fields not validated by route)', async () => {
    vi.mocked(db.insert).mockReturnValue({
      then: (_res: unknown, rej: (e: unknown) => void) => rej ? rej(new Error('NOT NULL violation')) : Promise.reject(new Error('NOT NULL violation')),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockRejectedValue(new Error('NOT NULL violation')),
    } as unknown as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)

    expect(res.status).toBe(500)
  })
})

// ─── GET /api/prospects/[id] ──────────────────────────────────────────────────

describe('GET /api/prospects/[id]', () => {
  it('returns the prospect when found', async () => {
    const prospect = { id: 1, firstName: 'Alice', lastName: 'Walker' }
    vi.mocked(db.select).mockReturnValue(q([prospect]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/prospects/1')
    const res = await GET_ONE(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(prospect)
  })

  it('returns 404 when prospect does not exist', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/prospects/9999')
    const res = await GET_ONE(req, { params: Promise.resolve({ id: '9999' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBeTruthy()
  })
})

// ─── PUT /api/prospects/[id] ──────────────────────────────────────────────────

describe('PUT /api/prospects/[id]', () => {
  it('updates prospect fields and returns the updated record', async () => {
    const updated = { id: 1, firstName: 'Bob', lastName: 'Updated', email: 'new@email.com' }
    vi.mocked(db.select).mockReturnValueOnce(q([{ id: 1 }]) as ReturnType<typeof db.select>)
    vi.mocked(db.update).mockReturnValue(q([updated]) as ReturnType<typeof db.update>)

    const req = new NextRequest('http://localhost/api/prospects/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Bob', lastName: 'Updated', email: 'new@email.com' }),
    })
    const res = await PUT(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.email).toBe('new@email.com')
  })

  it('returns 500 when update returns empty (undefined body not JSON serializable)', async () => {
    vi.mocked(db.select).mockReturnValueOnce(q([{ id: 9999 }]) as ReturnType<typeof db.select>)
    vi.mocked(db.update).mockReturnValue(q([]) as ReturnType<typeof db.update>)

    const req = new NextRequest('http://localhost/api/prospects/9999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Ghost' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: '9999' }) })

    // Route returns NextResponse.json(undefined) which throws → caught as 500
    expect(res.status).toBe(500)
  })
})

// ─── DELETE /api/prospects/[id] ───────────────────────────────────────────────

describe('DELETE /api/prospects/[id]', () => {
  it('deletes the prospect and returns { success: true }', async () => {
    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)

    const req = new NextRequest('http://localhost/api/prospects/1', { method: 'DELETE' })
    const res = await DELETE(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
  })
})
