import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendLinkedInMessage, sendLinkedInConnection } from '@/lib/linkedin-sender'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('sendLinkedInMessage (stub)', () => {
  it('returns { success: true, stub: true }', async () => {
    const result = await sendLinkedInMessage(
      'member-123', 'linkedin.com/in/prospect', 'Hello there', 'token-abc', 'Mozilla/5.0',
    )
    expect(result).toEqual({ success: true, stub: true })
  })

  it('logs to console with [LINKEDIN STUB] prefix', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendLinkedInMessage('m1', 'url', 'Message body', 'tok', 'ua')
    expect(consoleSpy).toHaveBeenCalled()
    const logArg = consoleSpy.mock.calls[0][0] as string
    expect(logArg).toContain('[LINKEDIN STUB]')
  })

  it('truncates long messages in the log (first 50 chars + ...)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const longMsg = 'A'.repeat(100)
    await sendLinkedInMessage('m1', 'url', longMsg, 'tok', 'ua')
    const logArg = consoleSpy.mock.calls[0][0] as string
    expect(logArg).toContain('...')
  })
})

describe('sendLinkedInConnection (stub)', () => {
  it('returns { success: true, stub: true }', async () => {
    const result = await sendLinkedInConnection(
      'member-123', 'linkedin.com/in/prospect', 'Connect with me', 'token-abc', 'Mozilla/5.0',
    )
    expect(result).toEqual({ success: true, stub: true })
  })

  it('logs to console with [LINKEDIN STUB] prefix', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendLinkedInConnection('m1', 'url', 'Hi', 'tok', 'ua')
    expect(consoleSpy).toHaveBeenCalled()
    const logArg = consoleSpy.mock.calls[0][0] as string
    expect(logArg).toContain('[LINKEDIN STUB]')
  })
})
