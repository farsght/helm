import { render } from "@testing-library/react"
import { CardGridSkeleton } from "../../src/components/page/card-grid-skeleton"
import { ListSkeleton } from "../../src/components/page/list-skeleton"
import { DetailSkeleton } from "../../src/components/page/detail-skeleton"
import { ErrorState } from "../../src/components/page/error-state"
import { EmptyState } from "../../src/components/page/empty-state"

describe("page-primitives smoke tests", () => {
  it("CardGridSkeleton renders without error (default count=6)", () => {
    const { container } = render(<CardGridSkeleton />)
    expect(container.querySelector('[data-slot="card-grid-skeleton"]')).not.toBeNull()
  })

  it("CardGridSkeleton count=6 renders 6 skeleton cards", () => {
    const { container } = render(<CardGridSkeleton count={6} />)
    const cards = container.querySelectorAll('[data-slot="card-grid-skeleton"] > div > div')
    expect(cards.length).toBe(6)
  })

  it("CardGridSkeleton count=3 columns=3 renders 3 cards", () => {
    const { container } = render(<CardGridSkeleton count={3} columns={3} />)
    const cards = container.querySelectorAll('[data-slot="card-grid-skeleton"] > div > div')
    expect(cards.length).toBe(3)
  })

  it("ListSkeleton renders without error (default count=5 rows)", () => {
    const { container } = render(<ListSkeleton />)
    expect(container.querySelector('[data-slot="list-skeleton"]')).not.toBeNull()
  })

  it("DetailSkeleton renders without error", () => {
    const { container } = render(<DetailSkeleton />)
    expect(container.querySelector('[data-slot="detail-skeleton"]')).not.toBeNull()
  })

  it("ErrorState renders without error (default title)", () => {
    const { container } = render(<ErrorState />)
    expect(container.querySelector('[data-slot="error-state"]')).not.toBeNull()
    expect(container.textContent).toContain("Something went wrong")
  })

  it("ErrorState with onRetry renders a retry button", () => {
    const onRetry = vi.fn()
    const { getByText } = render(<ErrorState title="Oops" onRetry={onRetry} />)
    expect(getByText("Try again")).toBeTruthy()
  })

  it("ErrorState with onRetry=undefined renders with NO retry button", () => {
    const { queryByText } = render(<ErrorState title="X" onRetry={undefined} />)
    expect(queryByText("Try again")).toBeNull()
  })

  it("EmptyState renders without error", () => {
    const { container } = render(<EmptyState title="Nothing here" />)
    expect(container.textContent).toContain("Nothing here")
  })
})
