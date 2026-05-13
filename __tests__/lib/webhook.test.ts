/**
 * GAP-19: fireWebhook — posts to webhookUrl setting, handles missing URL and fetch errors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
import { fireWebhook } from '@/lib/webhook'

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('fireWebhook', () => {
  it('POSTs to webhookUrl with event name, data, and timestamp', async () => {
    vi.mocked(db.select).mockReturnValue(
      q([{ key: 'webhookUrl', value: 'https://example.com/hook' }]) as ReturnType<typeof db.select>,
    )

    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    const before = Date.now()
    await fireWebhook('test_event', { id: 1, info: 'data' })
    const after = Date.now()

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(callBody.event).toBe('test_event')
    expect(callBody.data).toEqual({ id: 1, info: 'data' })
    expect(callBody.ts).toBeGreaterThanOrEqual(before)
    expect(callBody.ts).toBeLessThanOrEqual(after)
  })

  it('does nothing when webhookUrl setting is null/missing', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)

    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await fireWebhook('some_event', {})

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does nothing when webhookUrl is an empty string', async () => {
    vi.mocked(db.select).mockReturnValue(
      q([{ key: 'webhookUrl', value: '' }]) as ReturnType<typeof db.select>,
    )

    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await fireWebhook('some_event', {})

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('swallows fetch errors and does not throw (non-fatal)', async () => {
    vi.mocked(db.select).mockReturnValue(
      q([{ key: 'webhookUrl', value: 'https://broken.example.com' }]) as ReturnType<typeof db.select>,
    )

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('fetch', mockFetch)

    // Should not throw
    await expect(fireWebhook('event', {})).resolves.not.toThrow()
  })

  it('swallows DB errors and does not throw (non-fatal)', async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error('DB down')
    })

    // Should not throw even if db.select blows up
    await expect(fireWebhook('event', {})).resolves.not.toThrow()
  })
})
