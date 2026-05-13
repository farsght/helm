/**
 * GAP-02 / GAP-03: CampaignsClient component — New Campaign, Start, Pause
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CampaignsClient } from '@/app/campaigns/campaigns-client'

// useRouter push is mocked in vitest.setup.ts
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
  vi.stubGlobal('alert', vi.fn())
})

const draftCampaign = {
  id: 1,
  name: 'Cold Outreach',
  description: 'A test campaign',
  status: 'draft',
  createdAt: new Date(),
  prospectCount: 5,
  stepCount: 3,
}

const activeCampaign = {
  ...draftCampaign,
  id: 2,
  name: 'Active Campaign',
  status: 'active',
}

describe('CampaignsClient', () => {
  it('renders campaign cards for all initial campaigns', () => {
    render(<CampaignsClient initialCampaigns={[draftCampaign, activeCampaign]} />)

    expect(screen.getByText('Cold Outreach')).toBeInTheDocument()
    expect(screen.getByText('Active Campaign')).toBeInTheDocument()
  })

  it('renders status badges correctly', () => {
    render(<CampaignsClient initialCampaigns={[draftCampaign, activeCampaign]} />)

    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('"New Campaign" button calls POST /api/campaigns and redirects to campaign page', async () => {
    const newCampaignId = 99
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: newCampaignId, name: 'New Campaign', status: 'draft' }),
    } as Response)

    render(<CampaignsClient initialCampaigns={[]} />)

    // Empty state has "Create Campaign" button
    const button = screen.getAllByRole('button').find(b => b.textContent?.includes('Campaign'))
    expect(button).toBeDefined()
    fireEvent.click(button!)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/campaigns', expect.objectContaining({ method: 'POST' }))
      expect(mockPush).toHaveBeenCalledWith(`/campaigns/${newCampaignId}`)
    })
  })

  it('"Start" button calls POST /api/campaigns/[id]/activate and shows "active" badge', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, campaign: { ...draftCampaign, status: 'active' } }),
    } as Response)

    render(<CampaignsClient initialCampaigns={[draftCampaign]} />)

    // Draft campaign shows a "Start" button
    const startBtn = screen.getByRole('button', { name: /start/i })
    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/campaigns/${draftCampaign.id}/activate`,
        expect.objectContaining({ method: 'POST' }),
      )
    })

    // Badge should update to "active" optimistically
    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument()
    })
  })

  it('"Pause" button calls POST /api/campaigns/[id]/pause and shows "paused" badge', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, campaign: { ...activeCampaign, status: 'paused' } }),
    } as Response)

    render(<CampaignsClient initialCampaigns={[activeCampaign]} />)

    const pauseBtn = screen.getByRole('button', { name: /pause/i })
    fireEvent.click(pauseBtn)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/campaigns/${activeCampaign.id}/pause`,
        expect.objectContaining({ method: 'POST' }),
      )
    })

    await waitFor(() => {
      expect(screen.getByText('paused')).toBeInTheDocument()
    })
  })

  it('shows empty state with "No campaigns yet" when no campaigns provided', () => {
    render(<CampaignsClient initialCampaigns={[]} />)
    expect(screen.getByText(/no campaigns yet/i)).toBeInTheDocument()
  })
})
