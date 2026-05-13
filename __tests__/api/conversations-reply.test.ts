/**
 * GAP-12: Conversation reply — POST with idempotency check
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

vi.mock('@/lib/webhook', () => ({
  fireWebhook: vi.fn().mockResolvedValue(undefined),
}))

import { db } from '@/db'
import { POST } from '@/app/api/conversations/[id]/reply/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }

const mockConversation = {
  id: 1,
  prospectId: 10,
  campaignId: 2,
  status: 'new',
  lastMessageAt: null,
}

const mockProspect = {
  id: 10,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
}

beforeEach(() => {
  vi.clearAllMocks()
})

function buildReplyRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/conversations/1/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupHappyPath(recentMessages: Record<string, unknown>[] = []) {
  // select calls: conversation, prospect, recent messages
  vi.mocked(db.select)
    .mockReturnValueOnce(q([mockConversation]) as ReturnType<typeof db.select>) // conversation
    .mockReturnValueOnce(q([mockProspect]) as ReturnType<typeof db.select>)     // prospect
    .mockReturnValueOnce(q(recentMessages) as ReturnType<typeof db.select>)    // last messages

  // insert: new reply message
  vi.mocked(db.insert).mockReturnValue(
    q([{ id: 50, body: 'Hello!', channel: 'email', direction: 'outbound' }]) as ReturnType<typeof db.insert>,
  )
  // update: conversation.updatedAt / lastMessageAt
  vi.mocked(db.update).mockReturnValue(q([mockConversation]) as ReturnType<typeof db.update>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/conversations/[id]/reply', () => {
  it('creates a reply message and returns 201', async () => {
    setupHappyPath()

    const req = buildReplyRequest({ body: 'Hello!', subject: 'Re: Hi' })
    const res = await POST(req, PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.body).toBe('Hello!')
    expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(1)
  })

  it('updates conversation.lastMessageAt when reply is created', async () => {
    setupHappyPath()

    const req = buildReplyRequest({ body: 'Follow-up' })
    await POST(req, PARAMS_1)

    expect(vi.mocked(db.update)).toHaveBeenCalledTimes(1)
  })

  it('idempotency: duplicate body within 60s returns existing message without inserting again (GAP-12)', async () => {
    const recentMsg = {
      id: 50,
      body: 'Hello!',
      direction: 'outbound',
      channel: 'email',
      // createdAt within last 60 seconds
      createdAt: new Date(Date.now() - 5000),
    }

    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockConversation]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([mockProspect]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([recentMsg]) as ReturnType<typeof db.select>)

    const req = buildReplyRequest({ body: 'Hello!' })
    const res = await POST(req, PARAMS_1)
    const body = await res.json()

    // Should return existing message with 200 — no new insert
    expect(res.status).toBe(200)
    expect(body.id).toBe(50)
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled()
  })

  it('non-duplicate body with same text but older than 60s is allowed', async () => {
    const oldMsg = {
      id: 48,
      body: 'Hello!',
      direction: 'outbound',
      channel: 'email',
      createdAt: new Date(Date.now() - 120000), // 2 minutes ago
    }

    vi.mocked(db.select)
      .mockReturnValueOnce(q([mockConversation]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([mockProspect]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(q([oldMsg]) as ReturnType<typeof db.select>)

    vi.mocked(db.insert).mockReturnValue(
      q([{ id: 51, body: 'Hello!', direction: 'outbound' }]) as ReturnType<typeof db.insert>,
    )
    vi.mocked(db.update).mockReturnValue(q([mockConversation]) as ReturnType<typeof db.update>)

    const req = buildReplyRequest({ body: 'Hello!' })
    const res = await POST(req, PARAMS_1)

    expect(res.status).toBe(201)
    expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when conversation does not exist', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)

    const req = buildReplyRequest({ body: 'Hi' })
    const res = await POST(req, { params: Promise.resolve({ id: '9999' }) })

    expect(res.status).toBe(404)
  })
})
