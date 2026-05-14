# Helm Tool — Project Plan

## Overview
An AI-powered Sales Development Representative (SDR) tool that automates multi-channel outreach campaigns via email and LinkedIn. Features a visual canvas workflow builder for designing campaign sequences, AI-generated personalized messaging, and ongoing conversation management.

## Core Concepts

### Campaigns
A campaign is a multi-step automated outreach sequence targeting a specific audience segment. Each campaign has:
- **Name & description**
- **Status**: Draft → Active → Paused → Completed → Archived
- **Membership group**: The audience/list assigned to this campaign
- **Workflow**: A visual sequence of steps on a canvas
- **Schedule**: Sending windows, timezone, daily limits
- **AI persona**: Tone, style, context for AI-generated messages

### Workflow Steps (Canvas Nodes)
Each step in a campaign workflow is a node on the canvas. Step types:

| Type | Description |
|------|-------------|
| **Email** | Send personalized email via connected email account |
| **LinkedIn Message** | Send LinkedIn DM or InMail |
| **LinkedIn Connection Request** | Send connection request with note |
| **LinkedIn Profile View** | View prospect's LinkedIn profile (warm-up) |
| **Wait** | Delay N hours/days before next step |
| **Condition** | Branch based on: opened email, replied, clicked link, accepted connection, etc. |
| **AI Decision** | AI evaluates conversation context and decides next action |
| **Manual Task** | Create a task for human review (e.g., "review this reply") |
| **Tag** | Add/remove tags on the prospect |
| **Move to Campaign** | Transfer prospect to another campaign |
| **End** | Remove prospect from campaign |

### Canvas Workflow Builder
- Infinite canvas with pan/zoom (like CRM workflow builder)
- Drag-and-drop node palette
- Bezier curve connections between nodes
- Node configuration panel (slide-out right panel)
- Conditional branching (if/else paths)
- Visual status indicators (how many prospects at each step)
- Mini-map for navigation

### Membership Groups (Lists)
- Named lists of prospects
- Import from CSV, CRM, or manual add
- Dynamic lists (filter-based: industry, title, company size, etc.)
- Static lists (manually curated)
- Enrichment: auto-fill missing data (company, title, LinkedIn URL, email)
- Prospect fields: name, email, company, title, LinkedIn URL, phone, industry, location, custom fields

### AI Messaging Engine
- **Template + AI hybrid**: Define message templates with AI-personalized sections
- **Variables**: {{first_name}}, {{company}}, {{title}}, {{custom_field}}, etc.
- **AI personalization**: Research prospect's LinkedIn/company and weave in relevant context
- **Conversation mode**: When prospect replies, AI can:
  - Draft a reply for human review
  - Auto-reply within guardrails (configurable)
  - Escalate to human
- **Tone controls**: Professional, casual, friendly, direct
- **A/B testing**: Multiple message variants per step, AI optimizes over time

### Conversations
- Unified inbox for all prospect replies (email + LinkedIn)
- Thread view per prospect
- AI-suggested replies
- Quick actions: reply, snooze, mark as interested/not interested, schedule meeting
- Status: New → In Progress → Interested → Meeting Booked → Not Interested → Unsubscribed

## Pages & UI

### 1. Dashboard (`/`)
- Active campaigns overview (cards)
- Key metrics: emails sent, replies, open rate, reply rate, meetings booked
- Recent conversations requiring attention
- Campaign performance chart (line/bar)

### 2. Campaigns (`/campaigns`)
- List/grid of all campaigns
- Status badges, prospect count, reply rate, step count
- Quick actions: pause, resume, duplicate, archive
- Create new campaign button

### 3. Campaign Detail (`/campaigns/[id]`)
- **Canvas tab**: Visual workflow builder
- **Prospects tab**: List of prospects in this campaign with status per step
- **Messages tab**: All messages sent/received in this campaign
- **Analytics tab**: Funnel visualization, step-by-step metrics
- **Settings tab**: Schedule, AI persona, sending limits

### 4. Campaign Canvas (`/campaigns/[id]/canvas`)
- Full-screen canvas workflow builder
- Left sidebar: node palette (drag to add)
- Right panel: node configuration (click node to configure)
- Top bar: campaign name, status toggle, save, zoom controls
- Connection handles on nodes for linking

### 5. Prospects (`/prospects`)
- DataTable with all prospects across all campaigns
- Columns: name, email, company, title, LinkedIn, campaign, step, status, last activity
- Bulk actions: add to campaign, tag, export
- Prospect detail slide-over: full profile, conversation history, campaign membership

### 6. Conversations (`/conversations`)
- Split-pane inbox layout (list left, thread right)
- Filter: all, needs reply, AI drafted, interested, meeting booked
- Channel indicators (email icon, LinkedIn icon)
- AI reply suggestions inline
- Quick reply composer

### 7. Lists (`/lists`)
- All membership groups
- Create/edit lists
- Import CSV
- Dynamic list builder (filter UI)
- Prospect count per list

### 8. Templates (`/templates`)
- Email and LinkedIn message templates
- Template editor with variable insertion
- AI generation: describe what you want → AI writes template
- A/B variant management

### 9. Analytics (`/analytics`)
- Cross-campaign performance
- Funnel: Contacted → Opened → Replied → Interested → Meeting
- Best performing templates
- Best sending times
- Reply rate by industry/title/company size

### 10. Settings (`/settings`)
- Connected accounts (email, LinkedIn)
- Sending limits & schedules
- AI configuration (model, tone, guardrails)
- Team members
- Webhook/integration settings
- Unsubscribe management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, TypeScript, App Router |
| UI | shadcn/ui (new-york), Tailwind CSS v4, Lucide icons |
| Canvas | Custom React canvas (pan/zoom/connections, same pattern as CRM) |
| Database | SQLite (local dev), portable |
| ORM | Drizzle ORM |
| AI | OpenAI GPT-4o-mini for message generation |
| Email | SMTP integration (configurable) |
| LinkedIn | Cookie-based API or Phantombuster integration |
| State | React Query for server state |
| Port | 3010 |

## Database Schema

### campaigns
- id, name, description, status, created_at, updated_at
- schedule_json (sending windows, timezone, daily limits)
- ai_persona_json (tone, context, guardrails)
- list_id (FK to lists)

### workflow_nodes
- id, campaign_id, type, label, config_json
- position_x, position_y
- created_at

### workflow_edges
- id, campaign_id, source_node_id, target_node_id
- condition_json (for conditional branches)
- label

### lists
- id, name, description, type (static/dynamic)
- filter_json (for dynamic lists)
- created_at, updated_at

### prospects
- id, first_name, last_name, email, company, title
- linkedin_url, phone, industry, location
- custom_fields_json
- created_at, updated_at

### list_members
- id, list_id, prospect_id, added_at

### campaign_prospects
- id, campaign_id, prospect_id
- current_node_id, status, enrolled_at
- last_activity_at, completed_at

### messages
- id, campaign_id, prospect_id, node_id
- channel (email/linkedin), direction (outbound/inbound)
- subject, body, body_html
- status (draft/scheduled/sent/delivered/opened/clicked/replied/bounced/failed)
- sent_at, opened_at, replied_at
- ai_generated (boolean), variant_id

### conversations
- id, prospect_id, campaign_id
- status (new/in_progress/interested/meeting_booked/not_interested/unsubscribed)
- last_message_at, assigned_to

### templates
- id, name, channel (email/linkedin), subject, body
- variables_json, created_at, updated_at

### template_variants
- id, template_id, name, subject, body
- send_count, reply_count

### connected_accounts
- id, type (email/linkedin), name, config_json
- status (active/disconnected/error)
- created_at

### tags
- id, name, color

### prospect_tags
- id, prospect_id, tag_id

## API Routes

### Campaigns
- GET/POST `/api/campaigns`
- GET/PUT/DELETE `/api/campaigns/[id]`
- POST `/api/campaigns/[id]/activate`
- POST `/api/campaigns/[id]/pause`
- POST `/api/campaigns/[id]/duplicate`

### Workflow
- GET/PUT `/api/campaigns/[id]/workflow` (nodes + edges)
- POST `/api/campaigns/[id]/workflow/nodes`
- PUT/DELETE `/api/campaigns/[id]/workflow/nodes/[nodeId]`
- POST `/api/campaigns/[id]/workflow/edges`
- DELETE `/api/campaigns/[id]/workflow/edges/[edgeId]`

### Prospects
- GET/POST `/api/prospects`
- GET/PUT/DELETE `/api/prospects/[id]`
- POST `/api/prospects/import` (CSV)
- POST `/api/prospects/[id]/enroll` (add to campaign)
- GET `/api/prospects/[id]/conversations`

### Lists
- GET/POST `/api/lists`
- GET/PUT/DELETE `/api/lists/[id]`
- GET/POST/DELETE `/api/lists/[id]/members`

### Messages
- GET `/api/messages`
- POST `/api/messages/send`
- POST `/api/messages/[id]/reply`
- POST `/api/messages/ai-generate` (AI draft)

### Conversations
- GET `/api/conversations`
- GET `/api/conversations/[id]`
- PUT `/api/conversations/[id]/status`
- POST `/api/conversations/[id]/reply`

### Templates
- GET/POST `/api/templates`
- GET/PUT/DELETE `/api/templates/[id]`
- POST `/api/templates/ai-generate`

### Analytics
- GET `/api/analytics/overview`
- GET `/api/analytics/campaigns/[id]`
- GET `/api/analytics/funnel`

### Settings
- GET/PUT `/api/settings/accounts`
- GET/PUT `/api/settings/sending`
- GET/PUT `/api/settings/ai`

## Build Phases

### Phase 1: Foundation (Core CRUD + Canvas)
1. Next.js project setup with shadcn/ui
2. SQLite + Drizzle schema + migrations
3. Campaign CRUD (list, create, edit, delete)
4. Canvas workflow builder (nodes, edges, pan/zoom, config panel)
5. Node types: Email, LinkedIn Message, Wait, Condition, End
6. List/prospect management (CRUD, CSV import)
7. Campaign prospect enrollment

### Phase 2: Messaging & AI
8. Template system (create, edit, variables)
9. AI message generation (OpenAI integration)
10. Message sending engine (queue-based)
11. Email integration (SMTP send)
12. Conversation inbox UI
13. AI reply suggestions

### Phase 3: Analytics & Polish
14. Dashboard with metrics
15. Campaign analytics (funnel, per-step stats)
16. A/B testing for templates
17. Settings pages
18. LinkedIn integration (Phantombuster or direct)

## Design Language
- Dark theme (matching CRM: #1B1B1F bg, #266DF0 blue accent)
- Inter font
- shadcn/ui new-york style
- Consistent with existing project portfolio
