/**
 * Email sender — Resend-based, plain-text-first.
 *
 * Strategy for ai-sdr v1:
 *   - Cold outbound campaigns send PLAIN TEXT by default (better deliverability,
 *     looks like a 1:1 human message, no tracking pixels = no Promotions tab)
 *   - HTML is opt-in per-send via `html` arg or per-campaign-node config
 *   - When both `text` and `html` are provided, Resend sends multipart/alternative
 *     so the recipient's client picks whichever it prefers
 *
 * Env vars (required):
 *   RESEND_API_KEY          — Resend project API key
 *   RESEND_FROM_EMAIL       — Default From address, e.g. "Scott <scott@mail.bitwage.com>"
 *
 * Env vars (optional):
 *   RESEND_REPLY_TO         — Default Reply-To (e.g. "scott@bitwage.com" so replies
 *                             hit the real inbox, not the sending subdomain)
 *
 * Deliverability hygiene (do these in the Resend dashboard, not in code):
 *   1. Verify a dedicated SUBDOMAIN like mail.bitwage.com — protects main domain
 *   2. SPF + DKIM + DMARC records (Resend gives you the DNS entries)
 *   3. Warm up gradually: 50/day week 1 → 200/day week 2-3 → unrestricted week 4+
 *
 * See docs/email.md for full deliverability + setup checklist.
 */

import { Resend } from "resend";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export interface SendEmailArgs {
  /** Recipient email address. */
  to: string;
  /** Subject line. */
  subject: string;
  /** Plain-text body. Prefer this for cold outbound. */
  text?: string;
  /** HTML body. Adds tracking-pixel surface area; only use for nurture/transactional. */
  html?: string;
  /**
   * From address. Defaults to RESEND_FROM_EMAIL.
   * Accepts either "name@domain.com" or "Name <name@domain.com>".
   */
  from?: string;
  /**
   * Reply-To address. Defaults to RESEND_REPLY_TO, then to `from`.
   * Useful when sending from a subdomain (mail.bitwage.com) but wanting
   * replies to land in the real inbox (scott@bitwage.com).
   */
  replyTo?: string;
  /**
   * Optional tag for Resend analytics — e.g. campaign id or node id.
   * Resend will surface these in their dashboard.
   */
  tags?: Array<{ name: string; value: string }>;
  /**
   * Optional headers — useful for List-Unsubscribe etc.
   */
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  /** Resend message ID — store this so webhooks can correlate later. */
  messageId: string;
  /** Provider used. Always "resend" today; reserved for future routing. */
  provider: "resend" | "stub";
}

export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigError";
  }
}

export class EmailSendError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "EmailSendError";
  }
}

// ──────────────────────────────────────────────────────────────────────
// Lazy singleton — don't construct Resend client at import time so the
// module loads cleanly in environments without RESEND_API_KEY set (tests,
// scripts that don't need to send).
// ──────────────────────────────────────────────────────────────────────

let _client: Resend | null = null;

function getClient(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new EmailConfigError(
      "RESEND_API_KEY is not set. Add it to .env.local (dev) or Vercel env (prod)."
    );
  }
  _client = new Resend(key);
  return _client;
}

function resolveFrom(arg?: string): string {
  const from = arg ?? process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new EmailConfigError(
      "No From address. Pass `from` or set RESEND_FROM_EMAIL."
    );
  }
  return from;
}

function resolveReplyTo(arg?: string, from?: string): string | undefined {
  return arg ?? process.env.RESEND_REPLY_TO ?? from;
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * Send an email via Resend.
 *
 * For cold outbound campaigns: pass only `text` (no `html`). This produces
 * a plain-text email with no tracking surface — best for inbox placement.
 *
 * For nurture/transactional: pass `html` (and ideally also `text` as
 * fallback for the rare client that doesn't render HTML).
 *
 * Throws:
 *   - EmailConfigError  — RESEND_API_KEY or From address missing
 *   - EmailSendError    — Resend API returned an error (transient, retry-safe)
 *
 * The workflow `sendCampaignEmail` step lets EmailSendError bubble — the
 * Workflow runtime will retry. EmailConfigError is wrapped in FatalError at
 * the caller because no amount of retrying fixes a missing API key.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  if (!args.text && !args.html) {
    throw new EmailConfigError(
      "Email must include either `text` or `html` (or both)."
    );
  }

  const from = resolveFrom(args.from);
  const replyTo = resolveReplyTo(args.replyTo, from);

  const client = getClient();

  // Resend SDK v6 typing requires either text or html (a discriminated union).
  // Build payload to satisfy that contract — we already checked one exists.
  const payload = {
    from,
    to: args.to,
    subject: args.subject,
    ...(args.text ? { text: args.text } : {}),
    ...(args.html ? { html: args.html } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(args.tags ? { tags: args.tags } : {}),
    ...(args.headers ? { headers: args.headers } : {}),
  } as Parameters<typeof client.emails.send>[0];

  const { data, error } = await client.emails.send(payload);

  if (error) {
    throw new EmailSendError(
      `Resend send failed: ${error.message ?? "unknown error"}`,
      error
    );
  }
  if (!data?.id) {
    throw new EmailSendError("Resend returned no message id");
  }

  return { messageId: data.id, provider: "resend" };
}

/**
 * Legacy positional signature — kept for backward compat with code paths
 * that still call sendEmail(to, subject, html, fromName, fromEmail).
 *
 * @deprecated Use sendEmail({ to, subject, text, html, from }) instead.
 *             This shim treats the third positional arg as HTML for
 *             back-compat with the stub; it does NOT auto-generate a text
 *             alternative. Migrate callers explicitly.
 */
export async function sendEmailLegacy(
  to: string,
  subject: string,
  html: string,
  fromName?: string,
  fromEmail?: string
): Promise<SendEmailResult> {
  const from =
    fromName && fromEmail
      ? `${fromName} <${fromEmail}>`
      : fromEmail ?? undefined;
  return sendEmail({ to, subject, html, from });
}
