import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the resend package before importing the module under test so the
// lazy singleton picks up the mock when getClient() runs.
//
// We use a hoisted holder for the send mock so vi.mock's factory (which runs
// at module-eval time, before any beforeEach) can wire it up while we still
// have test-level reset control.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

import { sendEmail, EmailConfigError, EmailSendError } from '@/lib/email-sender'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  sendMock.mockReset()
  process.env.RESEND_API_KEY = 'test_key_abc'
  process.env.RESEND_FROM_EMAIL = 'Scott <scott@mail.example.com>'
  delete process.env.RESEND_REPLY_TO
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('sendEmail — Resend backend', () => {
  it('returns messageId from Resend response', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'resend_msg_123' }, error: null })

    const result = await sendEmail({
      to: 'prospect@acme.com',
      subject: 'Hello',
      text: 'Hi there',
    })

    expect(result).toEqual({ messageId: 'resend_msg_123', provider: 'resend' })
  })

  it('sends plain text only when only text is provided (no html in payload)', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'r1' }, error: null })

    await sendEmail({
      to: 'p@x.com',
      subject: 'S',
      text: 'plain body',
    })

    const payload = sendMock.mock.calls[0]?.[0]
    expect(payload).toMatchObject({ to: 'p@x.com', subject: 'S', text: 'plain body' })
    expect(payload).not.toHaveProperty('html')
  })

  it('sends HTML only when only html is provided', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'r1' }, error: null })

    await sendEmail({
      to: 'p@x.com',
      subject: 'S',
      html: '<p>hi</p>',
    })

    const payload = sendMock.mock.calls[0]?.[0]
    expect(payload).toMatchObject({ html: '<p>hi</p>' })
    expect(payload).not.toHaveProperty('text')
  })

  it('sends both when both are provided (multipart/alternative)', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'r1' }, error: null })

    await sendEmail({
      to: 'p@x.com',
      subject: 'S',
      text: 'plain',
      html: '<p>fancy</p>',
    })

    const payload = sendMock.mock.calls[0]?.[0]
    expect(payload).toMatchObject({ text: 'plain', html: '<p>fancy</p>' })
  })

  it('uses RESEND_FROM_EMAIL when no from arg is provided', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'r1' }, error: null })

    await sendEmail({ to: 'p@x.com', subject: 'S', text: 'b' })

    expect(sendMock.mock.calls[0]?.[0].from).toBe('Scott <scott@mail.example.com>')
  })

  it('explicit from arg overrides env default', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'r1' }, error: null })

    await sendEmail({
      to: 'p@x.com',
      subject: 'S',
      text: 'b',
      from: 'Custom <custom@x.com>',
    })

    expect(sendMock.mock.calls[0]?.[0].from).toBe('Custom <custom@x.com>')
  })

  it('uses RESEND_REPLY_TO when set and no replyTo arg passed', async () => {
    process.env.RESEND_REPLY_TO = 'scott@example.com'
    sendMock.mockResolvedValueOnce({ data: { id: 'r1' }, error: null })

    await sendEmail({ to: 'p@x.com', subject: 'S', text: 'b' })

    expect(sendMock.mock.calls[0]?.[0].replyTo).toBe('scott@example.com')
  })

  it('falls back to from when no replyTo env or arg', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'r1' }, error: null })

    await sendEmail({ to: 'p@x.com', subject: 'S', text: 'b' })

    expect(sendMock.mock.calls[0]?.[0].replyTo).toBe('Scott <scott@mail.example.com>')
  })

  it('forwards tags + headers when provided', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'r1' }, error: null })

    await sendEmail({
      to: 'p@x.com',
      subject: 'S',
      text: 'b',
      tags: [{ name: 'campaign_id', value: '42' }],
      headers: { 'List-Unsubscribe': '<mailto:unsub@x.com>' },
    })

    const payload = sendMock.mock.calls[0]?.[0]
    expect(payload.tags).toEqual([{ name: 'campaign_id', value: '42' }])
    expect(payload.headers).toEqual({ 'List-Unsubscribe': '<mailto:unsub@x.com>' })
  })

  it('throws EmailConfigError when neither text nor html provided', async () => {
    await expect(
      sendEmail({ to: 'p@x.com', subject: 'S' } as unknown as Parameters<typeof sendEmail>[0]),
    ).rejects.toBeInstanceOf(EmailConfigError)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('throws EmailConfigError when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY
    // Need a fresh module to pick up the deleted env var (lazy singleton)
    vi.resetModules()
    const { sendEmail: freshSend, EmailConfigError: FreshErr } = await import(
      '@/lib/email-sender'
    )

    await expect(
      freshSend({ to: 'p@x.com', subject: 'S', text: 'b' }),
    ).rejects.toBeInstanceOf(FreshErr)
  })

  it('throws EmailSendError when Resend returns an error', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid recipient' },
    })

    await expect(
      sendEmail({ to: 'bad@x.com', subject: 'S', text: 'b' }),
    ).rejects.toBeInstanceOf(EmailSendError)
  })

  it('throws EmailSendError when Resend returns no message id', async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: null })

    await expect(
      sendEmail({ to: 'p@x.com', subject: 'S', text: 'b' }),
    ).rejects.toBeInstanceOf(EmailSendError)
  })
})
