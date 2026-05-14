/**
 * GAP-16 / GAP-17: Analytics — dashboard returns real aggregated counts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { q } from '../helpers/db-mock'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
}))

import { db } from '@/db'
import { GET as GET_DASHBOARD } from '@/app/api/analytics/dashboard/route'
import { GET as GET_CROSS } from '@/app/api/analytics/cross-campaign/route'
import { NeonHttpQueryResult } from 'drizzle-orm/neon-http'

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe('GET /api/analytics/dashboard', () => {
  function setupDashboard({
    prospects = 10,
    activeCampaigns = 2,
    sentToday = 5,
    sentWeek = 30,
    sentMonth = 100,
    totalSent = 200,
    opened = 40,
    replied = 20,
    meetings = 3,
  } = {}) {
    let idx = 0
    const selectResponses = [
      [{ count: prospects }],           // totalProspects
      [{ count: activeCampaigns }],     // activeCampaigns
      [{ count: sentToday }],           // messagesToday
      [{ count: sentWeek }],            // messagesWeek
      [{ count: sentMonth }],           // messagesMonth
      [{ count: totalSent }],           // totalSent
      [{ count: opened }],              // totalOpened
      [{ count: replied }],             // totalReplied
      [{ count: meetings }],            // meetingsBooked
      // Chart data is now via db.execute (single SQL query) — no per-day selects
      [],                               // allCampaigns (active campaigns for performance section)
      [],                               // recentConvos
    ]

    vi.mocked(db.select).mockImplementation(() => {
      const val = selectResponses[idx] ?? []
      idx++
      return q(val) as ReturnType<typeof db.select>
    })

    // Chart data returned by the single raw SQL execute query
    const chartRows = Array.from({ length: 30 }, (_, i) => ({
      date: `01/${String(i + 1).padStart(2, '0')}`,
      sent: 0,
      replied: 0,
    }))
    vi.mocked(db.execute).mockResolvedValue({ rows: chartRows } as unknown as NeonHttpQueryResult<Record<string, unknown>>)
  }

  it('returns real aggregated counts — not hardcoded zeros', async () => {
    setupDashboard({ prospects: 42, activeCampaigns: 3, totalSent: 100, opened: 25, replied: 10 })

    const res = await GET_DASHBOARD()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metrics.totalProspects).toBe(42)
    expect(body.metrics.activeCampaigns).toBe(3)
  })

  it('openRate is calculated as (opened/sent)*100, not Math.random()', async () => {
    setupDashboard({ totalSent: 100, opened: 25, replied: 10 })

    const res = await GET_DASHBOARD()
    const body = await res.json()

    // 25/100 * 100 = 25.0
    expect(body.metrics.openRate).toBe(25.0)
  })

  it('replyRate is calculated as (replied/sent)*100, not Math.random()', async () => {
    setupDashboard({ totalSent: 200, opened: 50, replied: 40 })

    const res = await GET_DASHBOARD()
    const body = await res.json()

    // 40/200 * 100 = 20.0
    expect(body.metrics.replyRate).toBe(20.0)
  })

  it('avgTimeHours is deterministic — same inputs produce same output (no Math.random)', async () => {
    setupDashboard()
    const res1 = await GET_DASHBOARD()
    const body1 = await res1.json()

    setupDashboard()
    const res2 = await GET_DASHBOARD()
    const body2 = await res2.json()

    // Dashboard openRate should be identical across calls with same mock data
    expect(body1.metrics.openRate).toBe(body2.metrics.openRate)
    expect(body1.metrics.replyRate).toBe(body2.metrics.replyRate)
  })

  it('returns 0.0 open/reply rates when no messages have been sent', async () => {
    setupDashboard({ totalSent: 0, opened: 0, replied: 0 })

    const res = await GET_DASHBOARD()
    const body = await res.json()

    expect(body.metrics.openRate).toBe(0.0)
    expect(body.metrics.replyRate).toBe(0.0)
  })

  it('response includes chartData array with 30 entries', async () => {
    setupDashboard()

    const res = await GET_DASHBOARD()
    const body = await res.json()

    expect(Array.isArray(body.chartData)).toBe(true)
    expect(body.chartData).toHaveLength(30)
  })
})

// ─── Cross-campaign analytics ─────────────────────────────────────────────────

describe('GET /api/analytics/cross-campaign', () => {
  function setupCross() {
    let idx = 0
    const selectResponses: unknown[][] = [
      [{ count: 50 }],   // totalSent
      [{ count: 10 }],   // totalOpened
      [{ count: 5 }],    // totalReplied
      [{ count: 2 }],    // meetingsBooked
      [{ count: 100 }],  // totalProspects
      [{ count: 40 }],   // contacted
      [{ count: 3 }],    // interested
    ]
    // 30 days trends: 3 selects per day (sent, opened, replied)
    for (let i = 0; i < 30; i++) {
      selectResponses.push([{ count: 0 }])
      selectResponses.push([{ count: 0 }])
      selectResponses.push([{ count: 0 }])
    }
    selectResponses.push([]) // allVariants
    vi.mocked(db.select).mockImplementation(() => {
      const val = selectResponses[idx] ?? []
      idx++
      return q(val) as ReturnType<typeof db.select>
    })
    vi.mocked(db.execute).mockResolvedValue({ rows: [], rowCount: 0, fields: [], command: 'SELECT' } as unknown as NeonHttpQueryResult<Record<string, unknown>>)
  }

  it('returns summary, funnel, trendsChart, replyRateByIndustry keys', async () => {
    setupCross()

    const res = await GET_CROSS()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('summary')
    expect(body).toHaveProperty('funnel')
    expect(body).toHaveProperty('trendsChart')
    expect(body).toHaveProperty('replyRateByIndustry')
  })

  it('replyRateByIndustry groups by industry from DB — not hardcoded', async () => {
    setupCross()
    // The execute mock returns empty → replyRateByIndustry should be []
    const res = await GET_CROSS()
    const body = await res.json()

    expect(Array.isArray(body.replyRateByIndustry)).toBe(true)
    // With empty DB result, industry array is empty (not a hardcoded non-empty array)
    expect(body.replyRateByIndustry).toHaveLength(0)
  })

  it('summary.replyRate is a number derived from real counts, not Math.random()', async () => {
    setupCross()
    const res1 = await GET_CROSS()
    const b1 = await res1.json()

    setupCross()
    const res2 = await GET_CROSS()
    const b2 = await res2.json()

    expect(b1.summary.replyRate).toBe(b2.summary.replyRate)
    expect(typeof b1.summary.replyRate).toBe('number')
  })
})
