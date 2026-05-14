/**
 * End-to-end integration: GAP-04
 * Simulate: create campaign → create prospects → enroll → execute → verify messages
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

vi.mock('@/lib/email-sender', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'stub-integration' }),
}))

vi.mock('@/lib/linkedin-sender', () => ({
  sendLinkedInMessage: vi.fn().mockResolvedValue({ success: true, stub: true }),
  sendLinkedInConnection: vi.fn().mockResolvedValue({ success: true, stub: true }),
}))

vi.mock('openai', () => {
  const OpenAI = vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'YES' } }] }) } },
  }))
  return { default: OpenAI }
})

import { db } from '@/db'
import { sendEmail } from '@/lib/email-sender'
import { POST as CREATE_CAMPAIGN } from '@/app/api/campaigns/route'
import { POST as CREATE_PROSPECT } from '@/app/api/prospects/route'
import { POST as ENROLL } from '@/app/api/campaigns/[id]/prospects/route'
import { POST as EXECUTE } from '@/app/api/campaigns/[id]/execute/route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Enrollment + Execution flow (integration)', () => {
  it('creates campaign → enrolls prospects → executes → creates message records', async () => {
    const CAMPAIGN_ID = 1
    const PROSPECT_ID = 10

    // ── Step 1: Create campaign ───────────────────────────────────────────────
    vi.mocked(db.insert).mockReturnValueOnce(
      q([{ id: CAMPAIGN_ID, name: 'Integration Test', status: 'draft' }]) as ReturnType<typeof db.insert>,
    )
    const createCampaignReq = new NextRequest('http://localhost/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Integration Test' }),
    })
    const campaignRes = await CREATE_CAMPAIGN(createCampaignReq)
    expect(campaignRes.status).toBe(201)
    const campaign = await campaignRes.json()
    expect(campaign.id).toBe(CAMPAIGN_ID)

    // ── Step 2: Create prospect ───────────────────────────────────────────────
    vi.mocked(db.insert).mockReturnValueOnce(
      q([{
        id: PROSPECT_ID, firstName: 'Jane', lastName: 'Doe',
        email: 'jane@corp.com', company: 'Corp',
      }]) as ReturnType<typeof db.insert>,
    )
    const createProspectReq = new NextRequest('http://localhost/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Jane', lastName: 'Doe', email: 'jane@corp.com' }),
    })
    const prospectRes = await CREATE_PROSPECT(createProspectReq)
    expect(prospectRes.status).toBe(201)
    const prospect = await prospectRes.json()
    expect(prospect.id).toBe(PROSPECT_ID)

    // ── Step 3: Enroll prospect in campaign ───────────────────────────────────
    vi.mocked(db.select).mockReturnValueOnce(q([{ id: CAMPAIGN_ID, name: 'Integration Test', status: 'draft', userId: 'test-user-id' }]) as ReturnType<typeof db.select>) // ownership check
    vi.mocked(db.select).mockReturnValueOnce(q([]) as ReturnType<typeof db.select>) // not yet enrolled
    vi.mocked(db.insert).mockReturnValueOnce(q([{ id: 100 }]) as ReturnType<typeof db.insert>)

    const enrollReq = new NextRequest(`http://localhost/api/campaigns/${CAMPAIGN_ID}/prospects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [PROSPECT_ID] }),
    })
    const enrollRes = await ENROLL(enrollReq, { params: Promise.resolve({ id: String(CAMPAIGN_ID) }) })
    const enrollment = await enrollRes.json()
    expect(enrollment.enrolled).toBe(1)

    // ── Step 4: Activate campaign (simulate via db state), then execute ───────
    const emailNode = {
      id: 200, type: 'email', label: 'Welcome Email',
      configJson: JSON.stringify({ subject: 'Welcome {{first_name}}', body: 'Hi {{first_name}}!' }),
    }
    const campaignProspectRecord = {
      id: 100, campaignId: CAMPAIGN_ID, prospectId: PROSPECT_ID,
      status: 'active', currentNodeId: null, nextRunAt: null,
    }

    let selectIdx = 0
    const executeSelectResults = [
      [{ id: CAMPAIGN_ID, name: 'Integration Test', status: 'active' }],  // campaign
      [{ campaignProspect: campaignProspectRecord, prospect: { id: PROSPECT_ID, firstName: 'Jane', lastName: 'Doe', email: 'jane@corp.com', company: 'Corp', title: null, linkedinUrl: null, phone: null, industry: null, location: null } }], // enrolled
      [emailNode],  // nodes
      [],           // edges (no outgoing → completes)
    ]
    vi.mocked(db.select).mockImplementation(() => {
      const val = executeSelectResults[selectIdx] ?? []
      selectIdx++
      return q(val) as ReturnType<typeof db.select>
    })
    vi.mocked(db.insert).mockReturnValue(q([{ id: 300 }]) as ReturnType<typeof db.insert>)
    vi.mocked(db.update).mockReturnValue(q([{ id: 100 }]) as ReturnType<typeof db.update>)

    const execReq = new NextRequest(`http://localhost/api/campaigns/${CAMPAIGN_ID}/execute`, { method: 'POST' })
    const execRes = await EXECUTE(execReq, { params: Promise.resolve({ id: String(CAMPAIGN_ID) }) })
    const execBody = await execRes.json()

    expect(execRes.status).toBe(200)
    expect(execBody.processed).toBe(1)

    // ── Step 5: Verify message was created ────────────────────────────────────
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'jane@corp.com',
      subject: 'Welcome Jane',
      text: 'Hi Jane!',
    })
    // db.insert called for the message record
    expect(vi.mocked(db.insert)).toHaveBeenCalled()
  })
})
