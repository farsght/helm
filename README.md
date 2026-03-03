# AI SDR - Sales Automation Platform

AI-powered Sales Development Representative tool that automates multi-channel outreach campaigns via email and LinkedIn. Features a visual canvas workflow builder for designing campaign sequences.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:seed      # Seed sample data

# Start development server
npm run dev          # Runs on http://localhost:3010

# Build for production
npm run build
npm start
```

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: shadcn/ui (new-york), Tailwind CSS v4
- **Database**: SQLite + Drizzle ORM
- **Canvas**: React Flow (@xyflow/react)
- **Icons**: Lucide React

## 📁 Project Structure

```
ai-sdr/
├── app/
│   ├── api/              # API routes
│   ├── campaigns/        # Campaign pages
│   ├── prospects/        # Prospects page
│   ├── lists/            # Lists page
│   ├── templates/        # Templates page
│   ├── conversations/    # Conversations page
│   ├── analytics/        # Analytics page
│   ├── settings/         # Settings page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Dashboard
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── workflow/         # Canvas workflow components
│   ├── campaign-canvas.tsx
│   └── sidebar.tsx
├── db/
│   ├── schema.ts         # Drizzle schema
│   ├── index.ts          # DB connection
│   ├── migrate.ts        # Migration runner
│   ├── seed.ts           # Seed script
│   └── migrations/       # Generated migrations
├── lib/
│   └── utils.ts          # Utility functions
├── drizzle.config.ts     # Drizzle configuration
└── PLAN.md               # Full project plan
```

## 🎨 Design System

- **Background**: #1B1B1F (dark)
- **Cards**: #25252A
- **Borders**: #3A3A40
- **Accent**: #266DF0 (blue)
- **Font**: Inter
- **Style**: Dark theme throughout

## 📊 Features (Phase 1)

### ✅ Dashboard
- Campaign overview cards
- Key metrics (messages sent, replies, open rate)
- Recent conversations

### ✅ Campaigns
- List/grid view of all campaigns
- Status badges and metrics
- Campaign detail page with tabs:
  - Canvas workflow builder
  - Enrolled prospects
  - Messages
  - Analytics
  - Settings

### ✅ Canvas Workflow Builder
- Infinite canvas with pan/zoom
- 11 node types:
  - Email
  - LinkedIn Message
  - LinkedIn Connection Request
  - LinkedIn Profile View
  - Wait
  - Condition
  - AI Decision
  - Manual Task
  - Tag
  - Move to Campaign
  - End
- Drag-and-drop from palette
- Visual connections with Bezier curves
- Node configuration panel
- Mini-map for navigation

### ✅ Prospects
- DataTable with all prospects
- Company, title, industry info
- Campaign enrollment status

### ✅ Lists
- Membership group management
- Member counts
- Static and dynamic list types

### ✅ Templates
- Email and LinkedIn message templates
- Variable support
- Channel-specific badges

### ✅ Conversations
- Split-pane inbox layout
- Conversation status tracking
- Message threading (placeholder)

### ✅ Analytics
- Campaign performance metrics
- Placeholder charts

### ✅ Settings
- Connected accounts (placeholder)
- Sending limits
- AI configuration
- Team management
- Integrations

## 🗄️ Database Schema

14 tables:
- `campaigns` — Campaign definitions
- `workflow_nodes` — Canvas nodes
- `workflow_edges` — Node connections
- `lists` — Prospect lists
- `prospects` — Contact database
- `list_members` — List membership
- `campaign_prospects` — Campaign enrollment
- `messages` — Sent/received messages
- `conversations` — Conversation threads
- `templates` — Message templates
- `template_variants` — A/B test variants
- `connected_accounts` — Email/LinkedIn accounts
- `tags` — Prospect tags
- `prospect_tags` — Tag assignments

## 🔌 API Routes

### Campaigns
- `GET/POST /api/campaigns`
- `GET/PUT/DELETE /api/campaigns/[id]`
- `GET/PUT /api/campaigns/[id]/workflow`

### Prospects
- `GET/POST /api/prospects`

### Lists
- `GET/POST /api/lists`

### Templates
- `GET/POST /api/templates`

### Messages
- `GET/POST /api/messages`

### Conversations
- `GET/POST /api/conversations`

### Analytics
- `GET /api/analytics/overview`

## 🛠️ Development

```bash
# Run dev server with turbopack
npm run dev

# Run type checking
npm run lint

# Generate migrations after schema changes
npm run db:generate

# Open Drizzle Studio
npm run db:studio
```

## 📦 Sample Data

The seed script (`npm run db:seed`) creates:
- 2 campaigns (1 active, 1 draft)
- 10 tech startup founder prospects
- 1 list with all prospects
- 2 complete workflows
- 2 message templates
- Sample messages and conversations

## 🎯 Phase 1 Status

✅ **COMPLETE** - All Phase 1 features implemented and tested

Next: Phase 2 (Messaging & AI)
- AI message generation
- Email sending engine
- LinkedIn integration
- Conversation management
- Reply suggestions

## 📄 License

Private project

## 👤 Author

Built by AI SDR team
