import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail } from '@/lib/email-sender'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('sendEmail (stub)', () => {
  it('returns an object with a messageId property', async () => {
    const result = await sendEmail('user@example.com', 'Hello', '<p>Hi</p>')
    expect(result).toHaveProperty('messageId')
    expect(typeof result.messageId).toBe('string')
  })

  it('messageId uses stub-${Date.now()} pattern — starts with "stub-"', async () => {
    const result = await sendEmail('user@example.com', 'Subject', '<p>Body</p>')
    expect(result.messageId).toMatch(/^stub-\d+$/)
  })

  it('messageId is unique per call (two rapid calls produce different IDs)', async () => {
    // Use fake timers to guarantee different timestamps
    vi.useFakeTimers()
    const result1 = await sendEmail('a@b.com', 'S1', 'B1')
    vi.advanceTimersByTime(1)
    const result2 = await sendEmail('a@b.com', 'S2', 'B2')
    vi.useRealTimers()

    expect(result1.messageId).not.toBe(result2.messageId)
  })

  it('logs to console when called (stub behaviour)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendEmail('target@x.com', 'Hi', '<b>Hello</b>', 'Sender Name', 'sender@x.com')
    expect(consoleSpy).toHaveBeenCalled()
    const logArg = consoleSpy.mock.calls[0][0] as string
    expect(logArg).toContain('[EMAIL STUB]')
  })

  it('accepts optional fromName and fromEmail parameters without throwing', async () => {
    await expect(
      sendEmail('to@x.com', 'Subject', '<p>hi</p>', 'My Name', 'from@x.com'),
    ).resolves.not.toThrow()
  })
})
