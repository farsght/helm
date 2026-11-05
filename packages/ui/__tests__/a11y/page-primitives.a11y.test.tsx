import { render } from "@testing-library/react"
import { axe } from "vitest-axe"
import { EmptyState } from "../../src/components/page/empty-state"
import { ErrorState } from "../../src/components/page/error-state"

describe("page-primitives a11y tests", () => {
  it("EmptyState has no axe violations", async () => {
    const { container } = render(<EmptyState title="Nothing here" />)
    const results = await axe(container, {
      rules: {
        "landmark-one-main": { enabled: false },
        "page-has-heading-one": { enabled: false },
        "region": { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })

  it("ErrorState has no axe violations", async () => {
    const { container } = render(<ErrorState />)
    const results = await axe(container, {
      rules: {
        "landmark-one-main": { enabled: false },
        "page-has-heading-one": { enabled: false },
        "region": { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})
