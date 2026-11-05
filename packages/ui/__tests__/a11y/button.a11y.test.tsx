import { render } from "@testing-library/react"
import { axe } from "vitest-axe"
import { Button } from "../../src/components/ui/button"

describe("Button a11y", () => {
  it("has no axe violations (text button)", async () => {
    const { container } = render(<Button>Submit</Button>)
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

  it("icon-only button with aria-label passes axe", async () => {
    const { container } = render(
      <Button size="icon" aria-label="Delete item">
        <span>X</span>
      </Button>
    )
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
