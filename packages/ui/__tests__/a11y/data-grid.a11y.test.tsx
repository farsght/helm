import { render } from "@testing-library/react"
import { axe } from "vitest-axe"
import { DataGridSkeleton } from "../../src/components/data-grid/data-grid-skeleton"

describe("DataGridSkeleton a11y (CORE-05)", () => {
  it("passes axe with no violations", async () => {
    const { container } = render(<DataGridSkeleton />)
    const results = await axe(container, {
      rules: {
        // Disable document-level rules that don't apply to isolated component tests
        "landmark-one-main": { enabled: false },
        "page-has-heading-one": { enabled: false },
        "region": { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})
