# Email Sending — helm

Last updated: 2026-05-14

How outbound email works in helm, why we made the choices we did, and the deliverability hygiene required before going live.

---

## Current state

| Path | Backend | Auth model | Used by |
|---|---|---|---|
| `lib/email-sender.ts` | **Resend API** | Centralized: one API key, one verified sending domain | Campaign workflow (`workflows/campaign-sequence.ts`), legacy `/api/campaigns/[id]/execute` |
| `app/api/messages/send/route.ts` | **nodemailer + SMTP** | BYOSMTP: per-user `connected_accounts.configJson` or `SMTP_*` env fallback | Ad-hoc one-off message sends from the UI |

Two paths coexist deliberately for now. See "Divergent paths — why" below.

---

## Strategic decisions

### Why Resend (centralized) for campaigns
- **Single auth config** — solo operator, one DNS setup, one billing tier
- **Better analytics** — opens/clicks/bounces flow to one dashboard (Resend's), plus we tag per send (`campaign_id`, `node_id`, `prospect_id`)
- **Higher throughput** — Resend handles 50k+ sends/mo on the $20 tier; Gmail caps a single Workspace mailbox at ~500/day
- **Faster to ship** — no Gmail/Outlook OAuth flow to build
- **Trade-off accepted** — all campaign emails come from a single bitwage sending subdomain. Personalization happens in the body, not in the apparent sender. Most prospects don't care; if your sales motion requires emails from real human Gmail mailboxes, revisit Strategy B (BYOSMTP) later.

### Why plain text by default
For cold outbound specifically, plain text wins:
- No tracking pixel → less Promotions tab routing on Gmail
- No HTML rendering → looks like a 1:1 human message, not a marketing template
- No link wrapping → Resend's click-tracking URLs look suspicious in cold outbound
- Statistically higher reply rates per email industry data

Trade-off: **no open tracking**. We track replies (already in the schema as `messages.repliedAt`) and use that as the primary engagement signal. If you need opens, configure that campaign node with `format: 'html'` or `format: 'both'`.

### Why we kept the nodemailer path
The Messages UI already supports BYOSMTP — users connect their own Gmail/Outlook via the Connected Accounts settings, and one-off sends use their mailbox. That's a legitimate feature: a sales rep wants their `john@bitwage.com` mailbox sending the personal follow-up, not the campaign subdomain. Don't break it.

The mental model:
- **Campaigns / sequences / scheduled** → Resend (bulk, tracked, branded)
- **One-off / personal / from-user-mailbox** → nodemailer + connected SMTP

Future convergence: if BYOSMTP turns out to be a niche need or per-user Resend subdomains are a better answer for your buyers, we can collapse to one path. Don't optimize for that until you know.

---

## Resend setup checklist (one-time)

Do these in this order. **Don't send a single campaign email until step 6 is done.**

1. **Create a Resend account + project** for helm at https://resend.com
2. **Add and verify a dedicated sending SUBDOMAIN** (not your apex domain). Examples: `mail.bitwage.com`, `go.bitwage.com`, `send.bitwage.com`.
   - Resend dashboard → Domains → Add → enter `mail.bitwage.com`
   - Why subdomain: protects your main domain's reputation if anything goes sideways with a campaign
3. **Paste the DNS records Resend generates** into your DNS provider (Cloudflare, Vercel DNS, wherever bitwage.com lives):
   - SPF (TXT record on `mail.bitwage.com`)
   - DKIM (CNAME records — Resend gives 3 of them, all required)
   - DMARC (TXT record on `_dmarc.bitwage.com`) — start with `p=none` to monitor, tighten to `p=quarantine` later
4. **Wait for verification** — Resend dashboard shows green checkmarks. Usually 5-30 min, occasionally up to a few hours depending on DNS propagation
5. **Generate API key** — Resend dashboard → API Keys → "Full access"
6. **Set env vars** — in `.env.local` (dev) AND Vercel project settings (prod):
   ```
   RESEND_API_KEY=re_<your-key>
   RESEND_FROM_EMAIL="Scott <scott@mail.bitwage.com>"
   RESEND_REPLY_TO=scott@bitwage.com   # optional, but recommended
   ```
7. **Domain warmup** — do NOT send 5k emails on day 1. Recommended ramp:
   - Week 1: 50/day max, mixed content
   - Week 2: 200/day
   - Week 3: 500/day
   - Week 4+: unrestricted (within Resend tier limits)
   - Track Resend dashboard for bounce rate, spam reports, deliverability score
8. **Configure Resend webhooks** (optional but recommended for v1.1):
   - Resend dashboard → Webhooks → Add endpoint
   - URL: `https://helm.gs/api/webhooks/resend` (route doesn't exist yet — see "Future" below)
   - Events: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`

---

## How to use `sendEmail()`

```ts
import { sendEmail } from "@/lib/email-sender"

// Cold outbound — plain text only (recommended default)
await sendEmail({
  to: "prospect@acme.com",
  subject: "Quick question about Series B",
  text: `Hey John,\n\nSaw your Series B announcement...\n\nScott`,
})

// Nurture / transactional — HTML with text fallback
await sendEmail({
  to: "user@signup.com",
  subject: "Welcome",
  text: "Plain text fallback",
  html: "<h1>Welcome</h1><p>...</p>",
})

// With campaign analytics tags + custom Reply-To
await sendEmail({
  to: "p@x.com",
  subject: "...",
  text: "...",
  from: "Jane <jane@mail.bitwage.com>",   // override env default
  replyTo: "jane@bitwage.com",
  tags: [
    { name: "campaign_id", value: "42" },
    { name: "node_id", value: "7" },
  ],
})
```

Errors thrown:
- **`EmailConfigError`** — missing API key, missing from address, neither text nor html provided. **Not retryable.** The campaign workflow converts these to `FatalError` so the run fails fast instead of looping forever.
- **`EmailSendError`** — Resend API returned an error (bad recipient, rate limit, network blip). **Retryable.** The workflow step lets it bubble; the Workflow runtime retries the step with backoff.

---

## Workflow integration (`campaign-sequence.ts`)

Campaign `email` nodes support these `configJson` fields:

```jsonc
{
  "subject": "Hello {{firstName}}",        // required-ish
  "body": "Hey {{firstName}},\n\n...",     // plain text body (template variables)
  "bodyHtml": "<p>Hey {{firstName}}</p>",  // optional HTML body
  "format": "text",                         // "text" (default) | "html" | "both"
  "fromName": "Scott",                      // optional, overrides RESEND_FROM_EMAIL
  "fromEmail": "scott@mail.bitwage.com",
  "replyTo": "scott@bitwage.com"            // optional, overrides RESEND_REPLY_TO
}
```

Template variables: `{{firstName}}`, `{{lastName}}`, `{{company}}`, `{{title}}`. Expand `renderTemplate()` in `workflows/campaign-sequence.ts` to add more.

---

## Pitfalls

1. **Don't apex-domain your sending address.** Use `mail.bitwage.com`, not `bitwage.com`. One bad campaign tanks reputation of the subdomain, not your whole company's email.
2. **Don't skip DMARC.** Gmail's bulk-sender requirements (Feb 2024) effectively make DMARC mandatory. Start with `p=none` for monitoring; you don't need to enforce immediately, but the record must exist.
3. **Don't send before domain warmup.** Sending 5k from a cold domain = instant spam folder. The 30-day ramp matters.
4. **Don't enable Resend's link tracking for cold outbound.** It rewrites every URL to `track.resend.com/abc123...` which is a giant deliverability red flag. Turn it OFF in the Resend project settings for the cold-outbound campaign. (Resend's per-send `disable_link_click_tracking` is a planned API; for now it's a project-level toggle.)
5. **Don't return tracking pixels in plain-text emails.** Conceptually impossible (no HTML), but I've seen attempts. If you need opens, you need `format: 'html'` or `format: 'both'`.
6. **The lazy client singleton means env-var changes need a server restart.** `getClient()` caches the Resend instance. Dev: kill `next dev` after changing RESEND_API_KEY. Prod: Vercel redeploys on env-var changes anyway.
7. **`messages.status = 'failed'` is set BEFORE the error is re-thrown.** Step retries will see the row as failed; on successful retry it transitions back to `'sent'`. If a step retries 5x then succeeds, you'll see status churn — that's normal.

---

## Future work

- **Resend webhook handler** at `/api/webhooks/resend` to populate `messages.openedAt`, `messages.repliedAt`, `messages.status='bounced'`. Webhook events carry our `tags` array so we can correlate back to the message row. Add `provider_message_id` column to `messages` table for direct lookup.
- **List-Unsubscribe header** — Gmail's bulk sender requirements include `List-Unsubscribe: <mailto:...>` and `List-Unsubscribe: <https://...>` (one-click). Add to default headers in `sendEmail()`.
- **Per-user Resend subdomains** if you SaaS this out and your customers want their own sending domain reputation
- **BYOSMTP for campaigns** if a customer specifically needs to send from their own Gmail/Outlook (build OAuth flow, expand `lib/email-sender.ts` to a router that picks Resend vs SMTP based on campaign settings)
- **Rate limiting** — currently each workflow spawns email sends independently. Once you have 1k+ active workflows, you'll want a shared semaphore so you don't blast Gmail's per-domain receiver limits.
- **Unsubscribe handling** — track `messages.status='unsubscribed'` and auto-skip future campaign sends to that recipient
