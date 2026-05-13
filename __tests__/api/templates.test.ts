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
import { GET, POST } from '@/app/api/templates/route'
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/templates/[id]/route'
import { POST as CREATE_VARIANT } from '@/app/api/templates/[id]/variants/route'
import { POST as SET_WINNER } from '@/app/api/templates/[id]/variants/[variantId]/set-winner/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }
const PARAMS_VARIANT = { params: Promise.resolve({ id: '1', variantId: '5' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/templates ───────────────────────────────────────────────────────

describe('GET /api/templates', () => {
  it('returns all templates', async () => {
    const mockTemplates = [
      { id: 1, name: 'Cold Email', channel: 'email', body: 'Hi {{first_name}}' },
    ]
    vi.mocked(db.select).mockReturnValue(q(mockTemplates) as ReturnType<typeof db.select>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(mockTemplates)
  })
})

// ─── POST /api/templates ──────────────────────────────────────────────────────

describe('POST /api/templates', () => {
  it('creates a template and returns 201', async () => {
    const created = {
      id: 1, name: 'Follow-up', channel: 'email',
      body: 'Hey {{first_name}}, following up...',
    }
    vi.mocked(db.insert).mockReturnValue(q([created]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Follow-up', channel: 'email',
        body: 'Hey {{first_name}}, following up...',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.name).toBe('Follow-up')
  })

  it('template body uses {{first_name}} not {{firstName}} variable format', async () => {
    const templateBody = 'Hi {{first_name}}, are you at {{company}}?'
    const created = { id: 2, name: 'T', channel: 'email', body: templateBody }
    vi.mocked(db.insert).mockReturnValue(q([created]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'T', channel: 'email', body: templateBody }),
    })
    const res = await POST(req)
    const responseBody = await res.json()

    expect(responseBody.body).toContain('{{first_name}}')
    expect(responseBody.body).not.toContain('{{firstName}}')
  })
})

// ─── GET /api/templates/[id] ──────────────────────────────────────────────────

describe('GET /api/templates/[id]', () => {
  it('returns the template when found', async () => {
    const template = { id: 1, name: 'Cold Email', channel: 'email', body: 'Hi' }
    vi.mocked(db.select).mockReturnValue(q([template]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/templates/1')
    const res = await GET_ONE(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(template)
  })

  it('returns 404 when template not found', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)

    const req = new NextRequest('http://localhost/api/templates/9999')
    const res = await GET_ONE(req, { params: Promise.resolve({ id: '9999' }) })

    expect(res.status).toBe(404)
  })
})

// ─── PUT /api/templates/[id] ──────────────────────────────────────────────────

describe('PUT /api/templates/[id]', () => {
  it('updates the template and returns it', async () => {
    const updated = { id: 1, name: 'Updated', channel: 'email', body: 'New body' }
    vi.mocked(db.update).mockReturnValue(q([updated]) as ReturnType<typeof db.update>)

    const req = new NextRequest('http://localhost/api/templates/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated', channel: 'email', body: 'New body' }),
    })
    const res = await PUT(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.name).toBe('Updated')
  })

  it('returns 404 when template does not exist', async () => {
    vi.mocked(db.update).mockReturnValue(q([]) as ReturnType<typeof db.update>)

    const req = new NextRequest('http://localhost/api/templates/9999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost', channel: 'email', body: 'x' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: '9999' }) })

    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/templates/[id] ───────────────────────────────────────────────

describe('DELETE /api/templates/[id]', () => {
  it('deletes the template and returns success', async () => {
    vi.mocked(db.delete).mockReturnValue(q(undefined) as ReturnType<typeof db.delete>)

    const req = new NextRequest('http://localhost/api/templates/1', { method: 'DELETE' })
    const res = await DELETE(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
  })
})

// ─── POST /api/templates/[id]/variants ────────────────────────────────────────

describe('POST /api/templates/[id]/variants', () => {
  it('creates a variant with all tracking counts initialised to 0', async () => {
    const variant = {
      id: 5, templateId: 1, name: 'Variant A', body: 'Alt body',
      sendCount: 0, openCount: 0, replyCount: 0, clickCount: 0, isWinner: false,
    }
    vi.mocked(db.insert).mockReturnValue(q([variant]) as ReturnType<typeof db.insert>)

    const req = new NextRequest('http://localhost/api/templates/1/variants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Variant A', body: 'Alt body' }),
    })
    const res = await CREATE_VARIANT(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sendCount).toBe(0)
    expect(body.isWinner).toBe(false)
  })
})

// ─── POST /api/templates/[id]/variants/[variantId]/set-winner ────────────────

describe('POST /api/templates/[id]/variants/[variantId]/set-winner', () => {
  it('marks chosen variant as winner and unmarks all others for that template', async () => {
    const winner = { id: 5, templateId: 1, isWinner: true }
    vi.mocked(db.update)
      .mockReturnValueOnce(q([]) as ReturnType<typeof db.update>)     // reset all
      .mockReturnValueOnce(q([winner]) as ReturnType<typeof db.update>) // set winner

    const req = new NextRequest('http://localhost/api/templates/1/variants/5/set-winner', {
      method: 'POST',
    })
    const res = await SET_WINNER(req, PARAMS_VARIANT)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.isWinner).toBe(true)
    // Two update calls: one to reset all, one to set winner
    expect(vi.mocked(db.update)).toHaveBeenCalledTimes(2)
  })
})
