/**
 * GAP-05 / GAP-13: ProspectsClient — search, pagination, edit dialog, delete
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProspectsClient } from '@/app/prospects/prospects-client'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
  vi.stubGlobal('alert', vi.fn())
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
})

const sampleProspects = [
  {
    id: 1, firstName: 'Alice', lastName: 'Wonder', email: 'alice@example.com',
    company: 'Acme', title: 'CTO', industry: 'Tech', linkedinUrl: null,
    campaignName: null, campaignStatus: null,
  },
  {
    id: 2, firstName: 'Bob', lastName: 'Builder', email: 'bob@constructs.com',
    company: 'Constructs Inc', title: 'VP', industry: 'Construction', linkedinUrl: null,
    campaignName: 'Cold Outreach', campaignStatus: 'active',
  },
]

describe('ProspectsClient', () => {
  it('renders prospect names in the table', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prospects: sampleProspects, total: 2 }),
    } as Response)

    render(<ProspectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Alice Wonder')).toBeInTheDocument()
      expect(screen.getByText('Bob Builder')).toBeInTheDocument()
    })
  })

  it('shows total prospects count', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prospects: sampleProspects, total: 2 }),
    } as Response)

    render(<ProspectsClient />)

    await waitFor(() => {
      expect(screen.getByText(/2 prospects/i)).toBeInTheDocument()
    })
  })

  it('search input triggers API call with ?search= param', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ prospects: [], total: 0 }),
    } as Response)

    render(<ProspectsClient />)

    const searchInput = screen.getByPlaceholderText(/search by name/i)
    await userEvent.type(searchInput, 'alice')

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls
      const searchCall = calls.find(c => (c[0] as string).includes('search=alice'))
      expect(searchCall).toBeDefined()
    })
  })

  it('pagination shows correct page count when total exceeds limit', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prospects: sampleProspects, total: 51 }),
    } as Response)

    // 51 prospects, limit=50 → 2 pages
    render(<ProspectsClient />)

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()
    })
  })

  it('pagination "Next" button calls API with page=2', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ prospects: sampleProspects, total: 51 }),
    } as Response)

    render(<ProspectsClient />)

    const nextBtn = await screen.findByRole('button', { name: /next/i })
    fireEvent.click(nextBtn)

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls
      const pageCall = calls.find(c => (c[0] as string).includes('page=2'))
      expect(pageCall).toBeDefined()
    })
  })

  it('edit button opens dialog pre-filled with prospect data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prospects: sampleProspects, total: 2 }),
    } as Response)

    render(<ProspectsClient />)

    // Wait for data to load
    await waitFor(() => {
      const allRows = screen.getAllByRole('row')
      const aliceRow = allRows.find(r => r.textContent?.includes('Alice Wonder'))
      expect(aliceRow).toBeDefined()
    })

    // Find and click the edit (pencil) button for Alice
    const allRows = screen.getAllByRole('row')
    const aliceRow = allRows.find(r => r.textContent?.includes('Alice Wonder'))!
    const rowButtons = aliceRow.querySelectorAll('button')
    fireEvent.click(rowButtons[0]) // First button = Edit

    // Edit dialog should open with Alice's data
    await waitFor(() => {
      expect(screen.getByText(/edit prospect/i)).toBeInTheDocument()
    })

    // First name field should be pre-filled
    const firstNameInput = screen.getByDisplayValue('Alice')
    expect(firstNameInput).toBeInTheDocument()
  })

  it('delete button shows confirmation dialog and calls DELETE on confirm', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prospects: sampleProspects, total: 2 }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    render(<ProspectsClient />)

    // Wait for data to load
    await waitFor(() => {
      const allRows = screen.getAllByRole('row')
      const bobRow = allRows.find(r => r.textContent?.includes('Bob Builder'))
      expect(bobRow).toBeDefined()
    })

    const allRows = screen.getAllByRole('row')
    const bobRow = allRows.find(r => r.textContent?.includes('Bob Builder'))!
    const rowButtons = bobRow.querySelectorAll('button')
    fireEvent.click(rowButtons[1]) // Second button = Delete

    await waitFor(() => {
      expect(confirm).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledWith(
        `/api/prospects/${sampleProspects[1].id}`,
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
  })

  it('after deletion prospect is removed from the list', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prospects: sampleProspects, total: 2 }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    render(<ProspectsClient />)

    await waitFor(() => {
      expect(screen.getByText('Bob Builder')).toBeInTheDocument()
    })

    const allRows = screen.getAllByRole('row')
    const bobRow = allRows.find(r => r.textContent?.includes('Bob Builder'))!
    const rowButtons = bobRow.querySelectorAll('button')
    fireEvent.click(rowButtons[1])

    await waitFor(() => {
      expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument()
    })
  })
})
