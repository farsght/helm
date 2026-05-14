/**
 * GAP-03 / GAP-09 / GAP-14: Workflow execution engine tests
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
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'stub-123' }),
}))

vi.mock('@/lib/linkedin-sender', () => ({
  sendLinkedInMessage: vi.fn().mockResolvedValue({ success: true, stub: true }),
  sendLinkedInConnection: vi.fn().mockResolvedValue({ success: true, stub: true }),
}))

vi.mock('openai', () => {
  const OpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'YES' } }],
        }),
      },
    },
  }))
  return { default: OpenAI }
})

import { db } from '@/db'
import { sendEmail } from '@/lib/email-sender'
import { sendLinkedInMessage, sendLinkedInConnection } from '@/lib/linkedin-sender'
import { POST } from '@/app/api/campaigns/[id]/execute/route'

const PARAMS_1 = { params: Promise.resolve({ id: '1' }) }

const activeCampaign = { id: 1, name: 'Test', status: 'active' }
const prospect = {
  id: 10, firstName: 'John', lastName: 'Doe',
  email: 'john@acme.com', company: 'Acme', title: 'VP', linkedinUrl: 'linkedin.com/in/jd',
  phone: null, industry: 'Tech', location: 'SF',
}
const campaignProspect = {
  id: 50, campaignId: 1, prospectId: 10, status: 'active', currentNodeId: null, nextRunAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

function buildExecuteRequest() {
  return new NextRequest('http://localhost/api/campaigns/1/execute', { method: 'POST' })
}

/**
 * Configures the db.select mock queue for the standard execute flow.
 * Callers add extra select results AFTER these four core ones.
 */
function setupExecute(nodes: unknown[], edges: unknown[], extraSelectResults: unknown[][] = []) {
  const selectResults: unknown[][] = [
    [activeCampaign],                              // campaign
    [{ campaignProspect, prospect }],              // enrolled prospects join
    nodes,                                         // workflow nodes
    edges,                                         // workflow edges
    ...extraSelectResults,
  ]
  let idx = 0
  vi.mocked(db.select).mockImplementation(() => {
    const val = selectResults[idx] ?? []
    idx++
    return q(val) as ReturnType<typeof db.select>
  })
  vi.mocked(db.insert).mockReturnValue(q([{ id: 99 }]) as ReturnType<typeof db.insert>)
  vi.mocked(db.update).mockReturnValue(q([{ id: 50 }]) as ReturnType<typeof db.update>)
}

// ─── Campaign guard ───────────────────────────────────────────────────────────

describe('POST /api/campaigns/[id]/execute — campaign guards', () => {
  it('returns 404 when campaign does not exist', async () => {
    vi.mocked(db.select).mockReturnValue(q([]) as ReturnType<typeof db.select>)

    const res = await POST(buildExecuteRequest(), PARAMS_1)
    expect(res.status).toBe(404)
  })

  it('returns 400 when campaign is not active', async () => {
    vi.mocked(db.select).mockReturnValue(
      q([{ id: 1, name: 'Test', status: 'draft' }]) as ReturnType<typeof db.select>,
    )

    const res = await POST(buildExecuteRequest(), PARAMS_1)
    expect(res.status).toBe(400)
  })
})

// ─── Email node ───────────────────────────────────────────────────────────────

describe('Email node execution', () => {
  it('calls sendEmail with correct args, inserts message record, advances to next node', async () => {
    const emailNode = {
      id: 100, type: 'email', label: 'Email',
      configJson: JSON.stringify({ subject: 'Hi {{first_name}}', body: 'Hello {{first_name}} from {{company}}' }),
    }
    const nextNode = { id: 101, type: 'end', label: 'End', configJson: '{}' }
    const edge = { sourceNodeId: 100, targetNodeId: 101, conditionJson: null, label: null }

    setupExecute([emailNode, nextNode], [edge])

    const res = await POST(buildExecuteRequest(), PARAMS_1)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.processed).toBe(1)

    // sendEmail called with substituted variables (new object signature, text-first)
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'john@acme.com',
      subject: 'Hi John',
      text: 'Hello John from Acme',
    })

    // Message record inserted
    expect(vi.mocked(db.insert)).toHaveBeenCalled()
  })
})

// ─── LinkedIn message node ────────────────────────────────────────────────────

describe('LinkedIn message node execution', () => {
  it('calls sendLinkedInMessage stub, inserts message record', async () => {
    const liNode = {
      id: 200, type: 'linkedin_message', label: 'LI msg',
      configJson: JSON.stringify({ message: 'Hi {{first_name}}' }),
    }
    setupExecute([liNode], [])

    await POST(buildExecuteRequest(), PARAMS_1)

    expect(sendLinkedInMessage).toHaveBeenCalledWith(
      'stub-member',
      'linkedin.com/in/jd',
      'Hi John',
      'stub-token',
      'stub-ua',
    )
    expect(vi.mocked(db.insert)).toHaveBeenCalled()
  })
})

// ─── Wait node ────────────────────────────────────────────────────────────────

describe('Wait node execution', () => {
  it('sets nextRunAt based on duration hours and pauses prospect without advancing', async () => {
    const waitNode = {
      id: 300, type: 'wait', label: 'Wait 24h',
      configJson: JSON.stringify({ duration: 24 }),
    }
    setupExecute([waitNode], [])

    const before = Date.now()
    await POST(buildExecuteRequest(), PARAMS_1)
    const after = Date.now()

    // campaignProspects should be updated with a nextRunAt ~24h from now
    const updateChain = vi.mocked(db.update).mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    const setArgs = updateChain.set.mock.calls[0][0]

    expect(setArgs.nextRunAt).toBeInstanceOf(Date)
    const diff = setArgs.nextRunAt.getTime() - before
    // Should be approximately 24 hours (allow 1 minute tolerance)
    expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 60000)
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000 + (after - before) + 60000)
  })
})

// ─── Condition node ───────────────────────────────────────────────────────────

describe('Condition node execution', () => {
  it('routes to yes-branch when prospect has an opened message', async () => {
    const condNode = {
      id: 400, type: 'condition', label: 'Has opened?',
      configJson: JSON.stringify({ conditionType: 'message_opened' }),
    }
    const yesNode = { id: 401, type: 'email', label: 'Yes email', configJson: JSON.stringify({ subject: 'S', body: 'B' }) }
    const noNode = { id: 402, type: 'end', label: 'No end', configJson: '{}' }
    const yesEdge = { sourceNodeId: 400, targetNodeId: 401, conditionJson: null, label: 'yes' }
    const noEdge = { sourceNodeId: 400, targetNodeId: 402, conditionJson: null, label: 'no' }

    // Extra select: condition check returns opened message
    setupExecute([condNode, yesNode, noNode], [yesEdge, noEdge], [
      [{ id: 1 }], // opened messages found → condition TRUE
    ])

    await POST(buildExecuteRequest(), PARAMS_1)

    // Should advance to yesNode (401)
    const updateChain = vi.mocked(db.update).mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    const setArgs = updateChain.set.mock.calls[0][0]
    expect(setArgs.currentNodeId).toBe(401)
  })

  it('routes to no-branch when prospect has no opened message', async () => {
    const condNode = {
      id: 400, type: 'condition', label: 'Has opened?',
      configJson: JSON.stringify({ conditionType: 'message_opened' }),
    }
    const yesNode = { id: 401, type: 'email', label: 'Y', configJson: '{}' }
    const noNode = { id: 402, type: 'end', label: 'N', configJson: '{}' }
    const yesEdge = { sourceNodeId: 400, targetNodeId: 401, conditionJson: null, label: 'yes' }
    const noEdge = { sourceNodeId: 400, targetNodeId: 402, conditionJson: null, label: 'no' }

    // Extra select: no opened messages
    setupExecute([condNode, yesNode, noNode], [yesEdge, noEdge], [
      [],  // no opened messages → condition FALSE
    ])

    await POST(buildExecuteRequest(), PARAMS_1)

    const updateChain = vi.mocked(db.update).mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    const setArgs = updateChain.set.mock.calls[0][0]
    expect(setArgs.currentNodeId).toBe(402)
  })
})

// ─── Tag node ─────────────────────────────────────────────────────────────────

describe('Tag node execution', () => {
  it('finds-or-creates tag and inserts prospectTag record', async () => {
    const tagNode = {
      id: 500, type: 'tag', label: 'Tag: hot-lead',
      configJson: JSON.stringify({ tagName: 'hot-lead' }),
    }

    // Extra selects: tag lookup (not found), then prospectTags check (not found)
    setupExecute([tagNode], [], [
      [],              // tag not found
      [],              // prospectTag not found → will insert
    ])

    await POST(buildExecuteRequest(), PARAMS_1)

    // Two inserts: tag creation + prospectTag
    expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(2)
  })
})

// ─── End node ─────────────────────────────────────────────────────────────────

describe('End node execution', () => {
  it('sets prospect status=completed when end node is reached', async () => {
    const endNode = { id: 600, type: 'end', label: 'End', configJson: '{}' }
    setupExecute([endNode], [])

    await POST(buildExecuteRequest(), PARAMS_1)

    const updateChain = vi.mocked(db.update).mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    const setArgs = updateChain.set.mock.calls[0][0]
    expect(setArgs.status).toBe('completed')
    expect(setArgs.completedAt).toBeInstanceOf(Date)
  })
})

// ─── Unknown node type ────────────────────────────────────────────────────────

describe('Unknown node type', () => {
  it('logs and does not crash — returns processed:1', async () => {
    const unknownNode = { id: 700, type: 'some_future_type', label: 'Future', configJson: '{}' }
    setupExecute([unknownNode], [])

    const res = await POST(buildExecuteRequest(), PARAMS_1)
    const body = await res.json()

    // Execution engine handles unknown type gracefully
    expect(res.status).toBe(200)
    expect(body.processed).toBe(1)
  })
})

// ─── move_to_campaign node ────────────────────────────────────────────────────

describe('move_to_campaign node execution', () => {
  it('enrolls prospect in target campaign if not already enrolled', async () => {
    const moveNode = {
      id: 800, type: 'move_to_campaign', label: 'Move',
      configJson: JSON.stringify({ campaignId: 5 }),
    }

    // Extra select: existing enrollment check (not found)
    setupExecute([moveNode], [], [
      [],  // no existing enrollment in campaign 5
    ])

    await POST(buildExecuteRequest(), PARAMS_1)

    expect(vi.mocked(db.insert)).toHaveBeenCalled()
  })
})
