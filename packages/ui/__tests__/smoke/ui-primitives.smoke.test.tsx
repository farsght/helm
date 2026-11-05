import { render } from "@testing-library/react"
import { Badge } from "../../src/components/ui/badge"
import { Card, CardHeader, CardTitle } from "../../src/components/ui/card"
import { Skeleton } from "../../src/components/ui/skeleton"
import { Dialog, DialogTrigger, DialogContent } from "../../src/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "../../src/components/ui/tabs"
import { Input } from "../../src/components/ui/input"
import { Button } from "../../src/components/ui/button"
import { Separator } from "../../src/components/ui/separator"

describe("ui-primitives smoke tests", () => {
  it("Badge renders without error (server-safe component)", () => {
    const { container } = render(<Badge>New</Badge>)
    expect(container.querySelector('[data-slot="badge"]')).not.toBeNull()
  })

  it("Dialog renders without error (client component)", () => {
    expect(() =>
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      )
    ).not.toThrow()
  })

  it("Card renders container element (server-safe component)", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>
    )
    expect(container.querySelector('[data-slot="card"]')).not.toBeNull()
  })

  it("Skeleton renders without error (server-safe component)", () => {
    const { container } = render(<Skeleton className="h-4 w-full" />)
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  })

  it("Tabs renders without error (client component)", () => {
    expect(() =>
      render(
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
          </TabsList>
        </Tabs>
      )
    ).not.toThrow()
  })

  it("Input renders without error (server-safe component)", () => {
    const { container } = render(<Input placeholder="Enter text" />)
    expect(container.querySelector('[data-slot="input"]')).not.toBeNull()
  })

  it("Button renders without error", () => {
    const { container } = render(<Button>Click me</Button>)
    expect(container.querySelector('[data-slot="button"]')).not.toBeNull()
  })

  it("Separator renders without error (client component)", () => {
    const { container } = render(<Separator />)
    expect(container.querySelector('[data-slot="separator"]')).not.toBeNull()
  })
})
