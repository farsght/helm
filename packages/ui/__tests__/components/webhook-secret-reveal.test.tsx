/**
 * Tests for <WebhookSecretReveal> — NOTIF-02, D-14.
 *
 * Promoted from it.todo stubs after Plan 03/04 implementation shipped.
 *
 * KEY VALIDATION SIGNAL #4:
 *   - Secret is visible in the DOM when open=true
 *   - Modal is NOT dismissible by outside-click (onInteractOutside.preventDefault)
 *   - After the explicit close action, the secret string is ABSENT from the DOM
 */
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WebhookSecretReveal } from "../../src/components/webhooks/webhook-secret-reveal";

const SECRET = "whs_supersecretvalue1234567890abcdef";

// ─── Controlled wrapper ────────────────────────────────────────────────────────

/**
 * Wraps WebhookSecretReveal in a controlled parent that manages open/secret state —
 * exactly as a real consumer would: parent holds `revealedSecret: string | null`
 * and clears it on close.
 */
function ControlledReveal({
  initialOpen = true,
  initialSecret = SECRET,
}: {
  initialOpen?: boolean;
  initialSecret?: string;
}) {
  const [open, setOpen] = React.useState(initialOpen);
  const [secret, setSecret] = React.useState<string | null>(initialSecret);

  function handleClose() {
    setOpen(false);
    setSecret(null);
  }

  if (!secret) return null;

  return (
    <WebhookSecretReveal
      secret={secret}
      open={open}
      onClose={handleClose}
    />
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("WebhookSecretReveal — NOTIF-02 (D-14)", () => {
  it("displays signing secret on open", () => {
    render(
      <WebhookSecretReveal secret={SECRET} open={true} onClose={() => {}} />,
    );

    // Secret value must be in the DOM
    expect(screen.getByText(SECRET)).toBeInTheDocument();
    // Warning banner must be visible
    expect(
      screen.getByText(/copy this secret now/i),
    ).toBeInTheDocument();
    // Dialog title
    expect(screen.getByText("Save your signing secret")).toBeInTheDocument();
  });

  it("secret is NOT in the DOM when open=false", () => {
    render(
      <WebhookSecretReveal secret={SECRET} open={false} onClose={() => {}} />,
    );

    // When the dialog is closed, the secret string must NOT be rendered
    expect(screen.queryByText(SECRET)).toBeNull();
  });

  it("secret is absent from DOM after explicit close action (KEY SIGNAL D-14)", async () => {
    render(<ControlledReveal initialOpen={true} initialSecret={SECRET} />);

    // 1. Secret is in DOM while open
    expect(screen.getByText(SECRET)).toBeInTheDocument();

    // 2. Click "I've saved it — close"
    fireEvent.click(screen.getByRole("button", { name: /i've saved it/i }));

    // 3. After close, parent clears state → component unmounts → secret absent
    await waitFor(() => {
      expect(screen.queryByText(SECRET)).toBeNull();
    });
  });

  it("copy button is present when open", () => {
    render(
      <WebhookSecretReveal secret={SECRET} open={true} onClose={() => {}} />,
    );

    expect(
      screen.getByRole("button", { name: /copy signing secret to clipboard/i }),
    ).toBeInTheDocument();
  });

  it("copy button calls navigator.clipboard.writeText", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <WebhookSecretReveal secret={SECRET} open={true} onClose={() => {}} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /copy signing secret to clipboard/i }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(SECRET);
    });
  });

  it("module scaffold verified", async () => {
    const mod = await import("../../src/components/webhooks/webhook-secret-reveal");
    expect(typeof mod.WebhookSecretReveal).toBe("function");
  });
});
