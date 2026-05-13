/**
 * GAP-10: Email webhook — open / click / reply events update message records
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
import { fireWebhook } from '@/lib/webhook'
import { POST } from '@/app/api/webhooks/email/route'

beforeEach(() => {
  vi.clearAllMocks()
})

function buildWebhookRequest(payload: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/webhooks/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

describe('POST /api/webhooks/email', () => {
  it('event=open sets message.openedAt and status=opened', async () => {
    vi.mocked(db.update).mockReturnValue(q([]) as ReturnType<typeof db.update>)

    const req = buildWebhookRequest({ messageId: '42', event: 'open' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const updateChain = vi.mocked(db.update).mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    const setCall = updateChain.set.mock.calls[0][0]
    expect(setCall.openedAt).toBeInstanceOf(Date)
    expect(setCall.status).toBe('opened')
  })

  it('event=click sets status=clicked', async () => {
    vi.mocked(db.update).mockReturnValue(q([]) as ReturnType<typeof db.update>)

    const req = buildWebhookRequest({ messageId: '42', event: 'click' })
    const res = await POST(req)

    const updateChain = vi.mocked(db.update).mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    const setCall = updateChain.set.mock.calls[0][0]
    expect(setCall.status).toBe('clicked')
  })

  it('event=reply sets message.repliedAt and status=replied, then fires webhook', async () => {
    const mockMsg = { id: 42, prospectId: 7, channel: 'email' }
    vi.mocked(db.update).mockReturnValue(q([]) as ReturnType<typeof db.update>)
    vi.mocked(db.select).mockReturnValue(q([mockMsg]) as ReturnType<typeof db.select>)

    const req = buildWebhookRequest({ messageId: '42', event: 'reply' })
    const res = await POST(req)

    expect(res.status).toBe(200)

    const updateChain = vi.mocked(db.update).mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    const setCall = updateChain.set.mock.calls[0][0]
    expect(setCall.repliedAt).toBeInstanceOf(Date)
    expect(setCall.status).toBe('replied')

    // fireWebhook should be called with reply event
    expect(fireWebhook).toHaveBeenCalledWith(
      'reply_received',
      expect.objectContaining({ prospectId: 7, messageId: 42 }),
    )
  })

  it('returns 400 when messageId is not a number', async () => {
    const req = buildWebhookRequest({ messageId: 'not-a-number', event: 'open' })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 200 with no-op when event type is unrecognised (no updates)', async () => {
    // No update call happens since event doesn't match
    const req = buildWebhookRequest({ messageId: '42', event: 'bounce' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(vi.mocked(db.update)).not.toHaveBeenCalled()
  })
})
