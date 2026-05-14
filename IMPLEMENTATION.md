# Helm Implementation Specification

## Overview

Helm is a sales development representative automation platform. Users build multi-step outreach campaigns on a visual canvas, enroll prospects into those campaigns, and the system automatically sends emails (and simulated LinkedIn messages) through a workflow engine. An AI layer (OpenAI GPT-4o-mini) generates personalized message variants and suggests replies to inbound prospect messages. Analytics track funnel conversion across campaigns.

**Current state:** The UI shell, database schema, and most API routes exist. However 22 gaps — ranging from silent data corruption to dead UI buttons — prevent the app from functioning end-to-end. This document describes every gap with enough specificity to implement without opening any other file.

**What needs to be built:** See Phases 1–3 below. Do them in order; Phase 1 bugs will silently corrupt data if left unfixed while building Phase 2/3 features.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router, React 19) |
| Language | TypeScript 5 |
| Database | PostgreSQL via Neon serverless (`@neondatabase/serverless`) |
| ORM | Drizzle ORM 0.45 (`drizzle-orm/neon-http`) |
| AI | OpenAI SDK 6.x (`openai` package, model `gpt-4o-mini`) |
| Email sending | Nodemailer 8 |
| Workflow canvas | @xyflow/react 12 (React Flow) |
| Charts | Recharts 3 |
| UI components | shadcn/ui (Radix UI + Tailwind CSS 4) |
| Dev server port | 3010 |
| DB client entry | `db/index.ts` — exports `db` (Drizzle instance) |
| Schema entry | `db/schema.ts` — exports all table definitions |
| Migrations | `npm run db:generate` / `npm run db:migrate` |

---

## Phase 1: Critical Fixes (app is broken without these)

### GAP-01: Workflow Save Breaks All Edge Connections

**Problem:** Saving a campaign workflow silently destroys all edge (connection) data. After save, the canvas appears empty of connections on reload.

**Root cause:** `app/api/campaigns/[id]/workflow/route.ts`, lines 28–68.

The PUT handler first deletes all existing `workflow_nodes` rows for the campaign (line 28), then re-inserts the nodes (lines 33–48). PostgreSQL assigns **new auto-increment IDs** to the freshly inserted nodes. But when edges are then inserted (lines 54–68), `edge.source` and `edge.target` values come from the request body — these are the **old string IDs** that React Flow held before the delete. The old IDs no longer exist in the database. This either triggers a foreign-key constraint violation (crashing the save) or, if constraints are deferred, inserts edges pointing to non-existent nodes.

```
// BROKEN — line 62-68
edges.map((edge) => ({
  campaignId,
  sourceNodeId: parseInt(String(edge.source)),   // old ID, node was deleted
  targetNodeId: parseInt(String(edge.target)),   // old ID, node was deleted
  ...
}))
```

**Implementation:** Build a client-to-DB ID map immediately after the node insert, then use it when inserting edges.

File to edit: `app/api/campaigns/[id]/workflow/route.ts`

Replace the entire PUT handler body (lines 22–76) with:

```typescript
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    const { nodes, edges } = await request.json();

    // Delete existing nodes (cascade deletes edges via FK)
    await db.delete(workflowNodes).where(eq(workflowNodes.campaignId, campaignId));

    // Build a map: React Flow string ID → new DB integer ID
    const idMap: Record<string, number> = {};

    if (nodes && Array.isArray(nodes) && nodes.length > 0) {
      for (const node of nodes as Array<{
        id: string;
        data: { type: string; label: string; config?: Record<string, unknown> };
        position: { x: number; y: number };
      }>) {
        const [inserted] = await db.insert(workflowNodes).values({
          campaignId,
          type: node.data.type,
          label: node.data.label,
          configJson: JSON.stringify(node.data.config || {}),
          positionX: node.position.x,
          positionY: node.position.y,
        }).returning();
        idMap[node.id] = inserted.id;
      }
    }

    if (edges && Array.isArray(edges) && edges.length > 0) {
      const edgeRows = (edges as Array<{
        source: string;
        target: string;
        condition?: Record<string, unknown>;
        label?: string;
      }>)
        .filter(edge => idMap[edge.source] && idMap[edge.target])
        .map(edge => ({
          campaignId,
          sourceNodeId: idMap[edge.source],
          targetNodeId: idMap[edge.target],
          conditionJson: edge.condition ? JSON.stringify(edge.condition) : null,
          label: edge.label ?? null,
        }));

      if (edgeRows.length > 0) {
        await db.insert(workflowEdges).values(edgeRows);
      }
    }

    const newNodes = await db.select().from(workflowNodes).where(eq(workflowNodes.campaignId, campaignId));
    return NextResponse.json({ success: true, nodes: newNodes, idMap });
  } catch (error) {
    console.error('Workflow save error:', error);
    return NextResponse.json({ error: 'Failed to save workflow' }, { status: 500 });
  }
}
```

**Acceptance criteria:**
1. Create a campaign, open the canvas, add 3 nodes and connect them with 2 edges.
2. Click Save.
3. Reload the page.
4. Verify all 3 nodes and 2 edges appear in their correct positions.
5. In the DB: `SELECT * FROM workflow_edges WHERE campaign_id = <id>` — all `source_node_id` and `target_node_id` values must match rows in `workflow_nodes`.

---

### GAP-02: "New Campaign" Button Has No Handler

**Problem:** Clicking "New Campaign" on the campaigns list page does nothing. There is no dialog, no form, no API call. Campaigns cannot be created from the UI.

**Root cause:** `app/campaigns/page.tsx`, lines 42–46 and 56–60. Both "New Campaign" / "Create Campaign" buttons have no `onClick` prop. The page is a server component with no client-side state.

**Implementation:**

1. Create a new client component `app/campaigns/campaign-create-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function CampaignCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, status: 'draft' }),
      });
      if (!res.ok) throw new Error('Failed to create campaign');
      const campaign = await res.json();
      onOpenChange(false);
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#25252A] border-[#3A3A40] text-white">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Campaign Name *</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-[#1B1B1F] border-[#3A3A40] text-white"
              placeholder="e.g., Q2 SaaS Outreach"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="bg-[#1B1B1F] border-[#3A3A40] text-white"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#3A3A40] text-gray-400">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !form.name.trim()}
            className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

2. Convert `app/campaigns/page.tsx` to a client component (add `'use client'` at top) OR extract just the button into a new `CampaignListHeader` client component that manages `dialogOpen` state and renders `CampaignCreateDialog`. The simplest approach: keep the page as a server component and add a small `'use client'` wrapper:

Create `app/campaigns/campaign-list-header.tsx`:
```typescript
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CampaignCreateDialog } from './campaign-create-dialog';

export function CampaignListHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
        <Plus className="mr-2 h-4 w-4" />
        New Campaign
      </Button>
      <CampaignCreateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
```

3. In `app/campaigns/page.tsx`, replace the static `<Button>` at line 42 with `<CampaignListHeader />`. Also replace the second "Create Campaign" button at line 56–60 with `<CampaignListHeader />`.

**Acceptance criteria:**
1. Click "New Campaign" — a dialog appears.
2. Enter name "Test Campaign", click "Create Campaign".
3. The route navigates to `/campaigns/<new-id>`.
4. `SELECT * FROM campaigns ORDER BY id DESC LIMIT 1` returns the new row with `status = 'draft'`.

---

### GAP-03: "Add Prospects" Button in Campaign Detail Is Inert

**Problem:** The "Add Prospects" button in the Prospects tab of the campaign detail page has no `onClick` handler. Prospects cannot be enrolled into campaigns from the UI.

**Root cause:** `app/campaigns/[id]/campaign-detail-client.tsx`, line 223:
```tsx
<Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
  Add Prospects
</Button>
```
No `onClick`, no dialog, no API call.

**Implementation:**

Step 1 — Add a backend enrollment endpoint. Create `app/api/campaigns/[id]/prospects/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaignProspects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/campaigns/[id]/prospects
// Body: { prospectIds: number[] }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    const { prospectIds } = await request.json();

    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json({ error: 'prospectIds array required' }, { status: 400 });
    }

    const enrolled = [];
    for (const prospectId of prospectIds) {
      // Skip if already enrolled
      const existing = await db.select()
        .from(campaignProspects)
        .where(and(
          eq(campaignProspects.campaignId, campaignId),
          eq(campaignProspects.prospectId, prospectId)
        ));
      if (existing.length > 0) continue;

      const [row] = await db.insert(campaignProspects).values({
        campaignId,
        prospectId,
        status: 'active',
      }).returning();
      enrolled.push(row);
    }

    return NextResponse.json({ enrolled: enrolled.length, rows: enrolled }, { status: 201 });
  } catch (err) {
    console.error('Enroll prospects error:', err);
    return NextResponse.json({ error: 'Failed to enroll prospects' }, { status: 500 });
  }
}

// GET /api/campaigns/[id]/prospects — list enrolled prospects
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    const { prospects, campaignProspects: cp } = await import('@/db/schema');
    const { eq: eqFn } = await import('drizzle-orm');

    const rows = await db.select({ prospect: prospects, enrollment: cp })
      .from(cp)
      .innerJoin(prospects, eqFn(cp.prospectId, prospects.id))
      .where(eqFn(cp.campaignId, campaignId));

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 });
  }
}
```

Step 2 — Add a dialog to the campaign detail. In `app/campaigns/[id]/campaign-detail-client.tsx`:

Add state:
```typescript
const [addProspectsOpen, setAddProspectsOpen] = useState(false);
const [allProspects, setAllProspects] = useState<Prospect[]>([]);
const [selectedProspectIds, setSelectedProspectIds] = useState<number[]>([]);
const [enrolling, setEnrolling] = useState(false);
```

Add a `loadAllProspects` function:
```typescript
const loadAllProspects = async () => {
  const res = await fetch('/api/prospects');
  const data = await res.json();
  setAllProspects(data);
  setAddProspectsOpen(true);
};
```

Update the button at line 223:
```tsx
<Button onClick={loadAllProspects} className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
  Add Prospects
</Button>
```

Add enrollment handler:
```typescript
const handleEnroll = async () => {
  if (selectedProspectIds.length === 0) return;
  setEnrolling(true);
  try {
    const res = await fetch(`/api/campaigns/${campaign.id}/prospects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: selectedProspectIds }),
    });
    if (!res.ok) throw new Error('Failed to enroll');
    setAddProspectsOpen(false);
    setSelectedProspectIds([]);
    router.refresh();
  } catch (err) {
    alert('Failed to enroll prospects');
  } finally {
    setEnrolling(false);
  }
};
```

Add a dialog (with a scrollable checklist of prospects from `allProspects`) below the existing dialogs in the JSX, using existing `Dialog`, `ScrollArea`, and `Button` imports already present in the file.

**Acceptance criteria:**
1. Open a campaign's Prospects tab.
2. Click "Add Prospects" — a dialog shows the full prospect list.
3. Check 2 prospects, click "Enroll".
4. Dialog closes, Prospects tab now shows those 2 names.
5. `SELECT * FROM campaign_prospects WHERE campaign_id = <id>` returns 2 rows with `status = 'active'`.

---

### GAP-04: Wait Node Throws Error, Marking Prospects as Failed

**Problem:** When the campaign execute engine encounters a `wait` node whose wait period has not yet elapsed, it throws `new Error('Wait period not complete')`. This exception propagates up to the `for` loop in the execute route handler, which catches it and adds the prospect to the `errors[]` array. The prospect is never re-queued; it stays at the wait node but is logged as an error. Worse, if `lastActivityAt` is null (first execution), the wait check is skipped entirely and execution continues past the wait — meaning the wait node does nothing on first run.

**Root cause:** `app/api/campaigns/[id]/execute/route.ts`, lines 183–194:

```typescript
case 'wait':
  const waitHours = config.hours || 24;
  if (campaignProspect.lastActivityAt) {
    const lastActivity = new Date(campaignProspect.lastActivityAt);
    if (Date.now() - lastActivity.getTime() < waitHours * 60 * 60 * 1000) {
      throw new Error('Wait period not complete');   // <-- breaks the loop
    }
  }
  break;
```

**Implementation:** Change the wait node to return a sentinel that signals "skip this prospect this run" rather than throwing. Refactor `processProspectStep` and `executeNode` to return a boolean indicating whether execution should advance.

In `app/api/campaigns/[id]/execute/route.ts`:

1. Change `executeNode` return type from `Promise<void>` to `Promise<'continue' | 'wait' | 'end'>`.

2. Replace the `wait` case:
```typescript
case 'wait': {
  const waitHours = config.hours || 24;
  if (!campaignProspect.lastActivityAt) {
    // First time hitting wait node — record timestamp, do not advance
    await db.update(campaignProspects)
      .set({ lastActivityAt: new Date() })
      .where(eq(campaignProspects.id, campaignProspect.id));
    return 'wait';
  }
  const elapsed = Date.now() - new Date(campaignProspect.lastActivityAt).getTime();
  if (elapsed < waitHours * 60 * 60 * 1000) {
    return 'wait';   // not yet, skip silently
  }
  return 'continue'; // wait period elapsed, advance
}
```

3. In `processProspectStep`, check the return value of `executeNode`:
```typescript
const result = await executeNode(campaignId, campaignProspect, prospect, currentNode);
if (result === 'wait') return; // skip — don't advance, don't error
if (result === 'end') return;
```

4. In the outer `for` loop in the `POST` handler, ensure wait-skipped prospects are NOT counted as errors:
```typescript
// The try/catch should now only catch genuine errors, not wait signals
// since wait returns 'wait' instead of throwing
```

**Acceptance criteria:**
1. Create a campaign with: Email node → Wait (2 hours) → Email node.
2. Enroll a prospect and run Execute.
3. First run: prospect stays at Wait node, `errors` array in response is empty, `processed` increments.
4. Run Execute again immediately: same result (still waiting).
5. Manually set `last_activity_at = NOW() - INTERVAL '3 hours'` in the DB for that `campaign_prospects` row.
6. Run Execute again: prospect advances past Wait to next Email node.

---

## Phase 2: Core Features (HIGH priority)

### GAP-05: Missing Individual Prospect Endpoints (GET / PUT / DELETE)

**Problem:** `app/api/prospects/route.ts` only has `GET` (all) and `POST`. There is no `app/api/prospects/[id]/route.ts`. The prospect table UI has no edit or delete capability, and no other part of the app can fetch/update a single prospect by ID.

**Root cause:** File `app/api/prospects/[id]/route.ts` does not exist.

**Implementation:** Create `app/api/prospects/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prospects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [prospect] = await db.select().from(prospects).where(eq(prospects.id, parseInt(id)));
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(prospect);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const [updated] = await db.update(prospects)
    .set({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email ?? null,
      company: body.company ?? null,
      title: body.title ?? null,
      linkedinUrl: body.linkedinUrl ?? null,
      phone: body.phone ?? null,
      industry: body.industry ?? null,
      location: body.location ?? null,
      customFieldsJson: body.customFields ? JSON.stringify(body.customFields) : null,
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, parseInt(id)))
    .returning();
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(prospects).where(eq(prospects.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
```

Also add edit and delete buttons to `app/prospects/prospects-client.tsx`. Add state:
```typescript
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
```

Add a `handleDelete` function:
```typescript
const handleDelete = async (id: number) => {
  if (!confirm('Delete this prospect?')) return;
  await fetch(`/api/prospects/${id}`, { method: 'DELETE' });
  setProspects(prev => prev.filter(p => p.id !== id));
};
```

Add action buttons in the `<TableRow>` for each prospect (new `<TableCell>` column).

**Acceptance criteria:**
- `GET /api/prospects/1` returns the prospect JSON.
- `PUT /api/prospects/1` with `{ "firstName": "Updated" }` updates the DB row.
- `DELETE /api/prospects/1` removes the row; subsequent `GET` returns 404.
- Delete button in the UI removes the row from the table without page reload.

---

### GAP-06: No Way to Add Prospects to a List (Missing POST/DELETE on List Members)

**Problem:** `app/api/lists/[id]/members/route.ts` has only `GET`. The list view dialog (`app/lists/lists-client.tsx`) shows members but has no "Add Member" button. Prospects cannot be added to or removed from lists.

**Root cause:** No `POST` or `DELETE` handler in `app/api/lists/[id]/members/route.ts`.

**Implementation:** Add POST and DELETE to `app/api/lists/[id]/members/route.ts`:

```typescript
// Add after the existing GET handler:

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listId = parseInt(id);
  const { prospectIds } = await request.json();

  if (!Array.isArray(prospectIds)) {
    return NextResponse.json({ error: 'prospectIds array required' }, { status: 400 });
  }

  const added = [];
  for (const prospectId of prospectIds) {
    const existing = await db.select().from(listMembers)
      .where(and(eq(listMembers.listId, listId), eq(listMembers.prospectId, prospectId)));
    if (existing.length > 0) continue;
    const [row] = await db.insert(listMembers).values({ listId, prospectId }).returning();
    added.push(row);
  }
  return NextResponse.json({ added: added.length }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listId = parseInt(id);
  const { prospectId } = await request.json();
  await db.delete(listMembers)
    .where(and(eq(listMembers.listId, listId), eq(listMembers.prospectId, prospectId)));
  return NextResponse.json({ success: true });
}
```

Add import: `import { and } from 'drizzle-orm';` and `import { listMembers } from '@/db/schema';` at the top of the file (currently only `listMembers` and `prospects` are imported from schema; verify existing imports first).

Also create `app/api/lists/[id]/route.ts` (the file does not exist):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lists } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [list] = await db.select().from(lists).where(eq(lists.id, parseInt(id)));
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(list);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(lists).where(eq(lists.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
```

**Acceptance criteria:**
- `POST /api/lists/1/members` with `{ "prospectIds": [2, 3] }` inserts rows in `list_members`.
- `GET /api/lists/1/members` returns those 2 prospects.
- `DELETE /api/lists/1/members` with `{ "prospectId": 2 }` removes that member.
- `DELETE /api/lists/1` deletes the list (cascade deletes `list_members` rows).

---

### GAP-07: Conversations API Returns All Prospect Messages, Not Conversation-Scoped Messages

**Problem:** Opening a conversation thread shows messages from ALL campaigns the prospect has ever been in, not just the current conversation.

**Root cause:** `app/api/conversations/[id]/route.ts`, lines 27–30:

```typescript
const conversationMessages = await db.select()
  .from(messages)
  .where(eq(messages.prospectId, conversation.conversation.prospectId))  // only scoped by prospect
  .orderBy(messages.createdAt);
```

There is no filter on `messages.campaignId`. If a prospect is enrolled in 3 campaigns, all 3 campaigns' messages appear in every conversation thread.

**Implementation:** Scope the query to `campaignId` when the conversation has one. In `app/api/conversations/[id]/route.ts`, replace lines 27–30:

```typescript
import { and, isNull, or } from 'drizzle-orm';

// ...

const conversationCampaignId = conversation.conversation.campaignId;

const conversationMessages = await db.select()
  .from(messages)
  .where(
    and(
      eq(messages.prospectId, conversation.conversation.prospectId),
      conversationCampaignId
        ? eq(messages.campaignId, conversationCampaignId)
        : isNull(messages.campaignId)
    )
  )
  .orderBy(messages.createdAt);
```

**Acceptance criteria:**
- Prospect enrolled in Campaign A and Campaign B with 3 messages each.
- `GET /api/conversations/<campaign-A-conversation-id>` returns exactly 3 messages, all with `campaign_id` matching Campaign A.

---

### GAP-08: Reply Route Uses Wrong Message to Determine Reply Channel

**Problem:** When sending a reply in `app/api/conversations/[id]/reply/route.ts`, the code queries for the "last message" to determine which channel (email vs linkedin) to use for the reply. However the query uses `.limit(1)` with no ORDER BY, so it fetches the **first** inserted message, not the most recent.

**Root cause:** `app/api/conversations/[id]/reply/route.ts`, lines 32–39:

```typescript
const lastMessages = await db.select()
  .from(messages)
  .where(eq(messages.prospectId, conversation.prospectId))
  .orderBy(messages.createdAt)   // ASC — gets OLDEST message
  .limit(1);
```

Wait — actually it does have `.orderBy(messages.createdAt)` but that is ascending (oldest first). The intent is clearly "last message", so it should be DESC.

**Implementation:** In `app/api/conversations/[id]/reply/route.ts`, change line 37:

```typescript
// BEFORE:
.orderBy(messages.createdAt)

// AFTER:
.orderBy(sql`${messages.createdAt} DESC`)
```

Add `import { sql } from 'drizzle-orm';` if not already imported. Alternatively use Drizzle's `desc()`:

```typescript
import { desc } from 'drizzle-orm';
// ...
.orderBy(desc(messages.createdAt))
```

**Acceptance criteria:**
- A prospect has an email conversation (1 email message) and then a LinkedIn message added later.
- `POST /api/conversations/<id>/reply` with `{ body: "test" }` creates a reply with `channel = 'linkedin'` (the most recent channel).

---

### GAP-09: Campaign List Pause/Start Buttons Have No onClick Handler

**Problem:** The Pause and Start buttons on each campaign card in `app/campaigns/page.tsx` (lines 106–121) have no `onClick` prop. They render but do nothing.

**Root cause:** `app/campaigns/page.tsx` is a server component. The buttons cannot call client-side handlers.

**Implementation:** Create `app/campaigns/campaign-status-button.tsx` as a client component:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Play, Pause, Loader2 } from 'lucide-react';

export function CampaignStatusButton({ campaignId, status }: { campaignId: number; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const endpoint = status === 'active' ? 'pause' : 'activate';
      const res = await fetch(`/api/campaigns/${campaignId}/${endpoint}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
    } catch {
      alert('Failed to update campaign status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleToggle}
      disabled={loading}
      className="flex-1 text-gray-400 hover:text-white hover:bg-[#3A3A40]"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : status === 'active' ? (
        <><Pause className="mr-2 h-4 w-4" />Pause</>
      ) : (
        <><Play className="mr-2 h-4 w-4" />Start</>
      )}
    </Button>
  );
}
```

In `app/campaigns/page.tsx`, replace the static `<Button>` at lines 106–121 with:
```tsx
<CampaignStatusButton campaignId={campaign.id} status={campaign.status} />
```

Remove the now-unused `Play` and `Pause` imports from the page file if no longer needed.

**Acceptance criteria:**
- Click "Start" on a draft campaign → status badge changes to "active" after page refresh.
- Click "Pause" on an active campaign → status badge changes to "paused".
- `SELECT status FROM campaigns WHERE id = <id>` reflects the new value.

---

### GAP-10: Cross-Campaign Analytics Returns Hardcoded Fake Data

**Problem:** Three sections of the Analytics page (`/analytics`) show fake static data that never changes: "Reply Rate by Industry", "Reply Rate by Job Title", and "Best Sending Times" heatmap.

**Root cause:** `app/api/analytics/cross-campaign/route.ts`, lines 138–186. These are literal hardcoded arrays with made-up numbers.

**Implementation:** Replace the hardcoded blocks with real DB queries. In `app/api/analytics/cross-campaign/route.ts`:

Replace lines 138–186 with:

```typescript
// Reply rate by industry — aggregate from prospects who have messages
const prospectsWithReplies = await db.select({
  industry: prospects.industry,
  replied: sql<number>`CASE WHEN ${messages.repliedAt} IS NOT NULL THEN 1 ELSE 0 END`,
})
  .from(messages)
  .innerJoin(prospects, eq(messages.prospectId, prospects.id))
  .where(eq(messages.direction, 'outbound'));

const industryMap: Record<string, { sent: number; replied: number }> = {};
for (const row of prospectsWithReplies) {
  const ind = row.industry || 'Unknown';
  if (!industryMap[ind]) industryMap[ind] = { sent: 0, replied: 0 };
  industryMap[ind].sent++;
  if (row.replied) industryMap[ind].replied++;
}
const replyRateByIndustry = Object.entries(industryMap)
  .map(([industry, { sent, replied }]) => ({
    industry,
    replyRate: sent > 0 ? (replied / sent) * 100 : 0,
    count: sent,
  }))
  .sort((a, b) => b.replyRate - a.replyRate)
  .slice(0, 5);

// Reply rate by title
const prospectsWithTitles = await db.select({
  title: prospects.title,
  replied: sql<number>`CASE WHEN ${messages.repliedAt} IS NOT NULL THEN 1 ELSE 0 END`,
})
  .from(messages)
  .innerJoin(prospects, eq(messages.prospectId, prospects.id))
  .where(eq(messages.direction, 'outbound'));

const titleMap: Record<string, { sent: number; replied: number }> = {};
for (const row of prospectsWithTitles) {
  const t = row.title || 'Unknown';
  if (!titleMap[t]) titleMap[t] = { sent: 0, replied: 0 };
  titleMap[t].sent++;
  if (row.replied) titleMap[t].replied++;
}
const replyRateByTitle = Object.entries(titleMap)
  .map(([title, { sent, replied }]) => ({
    title,
    replyRate: sent > 0 ? (replied / sent) * 100 : 0,
    count: sent,
  }))
  .sort((a, b) => b.replyRate - a.replyRate)
  .slice(0, 5);

// Sending time heatmap — real data from messages.sent_at
const sentMessages = await db.select({ sentAt: messages.sentAt })
  .from(messages)
  .where(and(eq(messages.direction, 'outbound'), sql`${messages.sentAt} IS NOT NULL`));

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const heatmapMap: Record<string, number> = {};
for (const { sentAt } of sentMessages) {
  if (!sentAt) continue;
  const d = new Date(sentAt);
  const day = DAYS[d.getDay()];
  const hour = d.getHours();
  const key = `${day}-${hour}`;
  heatmapMap[key] = (heatmapMap[key] || 0) + 1;
}
const sendingTimeHeatmap = Object.entries(heatmapMap).map(([key, count]) => {
  const [day, hour] = key.split('-');
  return { day, hour: parseInt(hour), count };
});
```

Add `import { prospects } from '@/db/schema';` to the file's import line (it already imports `messages`, `conversations`, `templateVariants` — add `prospects`).

**Acceptance criteria:**
- With no messages in the DB: all three sections return empty arrays (not hardcoded data).
- With 10 messages sent to prospects in the "SaaS" industry, 3 of which have `replied_at` set: "Reply Rate by Industry" shows SaaS at 30%.

---

### GAP-11: A/B Variant Stats Are Never Updated

**Problem:** `template_variants` rows have `send_count`, `open_count`, `reply_count`, `click_count` columns that are always 0. They are never incremented anywhere. The `messages` table has a `variant_id` FK column that is also never populated when executing a campaign. The A/B test analytics in the campaign detail page always show empty data.

**Root cause 1:** `app/api/campaigns/[id]/execute/route.ts`, `executeNode()` function, lines 171–181 — creates `messages` rows with no `variantId` set.

**Root cause 2:** No code anywhere increments `templateVariants.sendCount`.

**Implementation:**

Step 1 — When a node has a `templateId` in its config, look up the winner variant (or pick one randomly if no winner) and set `variantId` on the message.

In `executeNode()` in `app/api/campaigns/[id]/execute/route.ts`, inside the `email` and `linkedin_message` cases:

```typescript
case 'email':
case 'linkedin_message': {
  let variantId: number | undefined;
  let subject = config.subject ? replaceVariables(config.subject, prospect) : undefined;
  let body = replaceVariables(config.body || config.message || '', prospect);

  if (config.templateId) {
    const { templateVariants } = await import('@/db/schema');
    const variants = await db.select().from(templateVariants)
      .where(eq(templateVariants.templateId, config.templateId));
    if (variants.length > 0) {
      const winner = variants.find(v => v.isWinner);
      const chosen = winner || variants[Math.floor(Math.random() * variants.length)];
      variantId = chosen.id;
      if (chosen.subject) subject = replaceVariables(chosen.subject, prospect);
      body = replaceVariables(chosen.body, prospect);

      // Increment send_count
      await db.update(templateVariants)
        .set({ sendCount: (chosen.sendCount || 0) + 1 })
        .where(eq(templateVariants.id, chosen.id));
    }
  }

  await db.insert(messages).values({
    campaignId,
    prospectId: prospect.id,
    nodeId: node.id,
    channel: node.type === 'email' ? 'email' : 'linkedin',
    direction: 'outbound',
    subject,
    body,
    status: 'scheduled',
    variantId: variantId ?? null,
  });
  break;
}
```

Step 2 — When a message status changes to `opened` or `replied` (via the tracking/webhook endpoint built in GAP-12), increment the corresponding variant counters.

**Acceptance criteria:**
- Create a template with 2 variants. Set `templateId` in a workflow email node's config.
- Run campaign execute for 4 prospects.
- `SELECT send_count FROM template_variants` — one or both variants have `send_count > 0` summing to 4.
- `SELECT variant_id FROM messages WHERE campaign_id = <id>` — all 4 message rows have non-null `variant_id`.

---

### GAP-12: Email Open/Reply Tracking Never Sets openedAt / repliedAt

**Problem:** `messages.opened_at` and `messages.replied_at` are never set anywhere in the codebase. All analytics that depend on open rates and reply rates return 0%. The campaign execute condition nodes `message_opened` and `message_replied` never evaluate to true.

**Root cause:** No tracking pixel endpoint and no inbound webhook handler exist.

**Implementation:**

Step 1 — Create an open-tracking pixel endpoint at `app/api/track/open/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/track/open?m=<messageId>
// Called when tracking pixel in email loads
export async function GET(request: NextRequest) {
  const messageId = parseInt(request.nextUrl.searchParams.get('m') || '0');
  if (messageId) {
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (msg && !msg.openedAt) {
      await db.update(messages)
        .set({ status: 'opened', openedAt: new Date() })
        .where(eq(messages.id, messageId));
    }
  }
  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
```

Step 2 — Create a reply webhook endpoint at `app/api/track/reply/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, conversations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/track/reply
// Body: { messageId?: number, prospectId: number, campaignId?: number, body: string, channel: 'email' | 'linkedin' }
// Call this endpoint from your email provider webhook or LinkedIn automation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, prospectId, campaignId, body: replyBody, channel } = body;

    // Mark the original message as replied
    if (messageId) {
      await db.update(messages)
        .set({ status: 'replied', repliedAt: new Date() })
        .where(eq(messages.id, messageId));
    } else {
      // Mark the most recent outbound message for this prospect as replied
      const [lastMsg] = await db.select().from(messages)
        .where(and(
          eq(messages.prospectId, prospectId),
          eq(messages.direction, 'outbound'),
          eq(messages.channel, channel || 'email')
        ))
        .orderBy(messages.createdAt)
        .limit(1);
      if (lastMsg) {
        await db.update(messages)
          .set({ status: 'replied', repliedAt: new Date() })
          .where(eq(messages.id, lastMsg.id));
      }
    }

    // Create inbound message record
    await db.insert(messages).values({
      campaignId: campaignId || null,
      prospectId,
      channel: channel || 'email',
      direction: 'inbound',
      body: replyBody,
      status: 'delivered',
    });

    // Update conversation
    const [conv] = await db.select().from(conversations)
      .where(eq(conversations.prospectId, prospectId));
    if (conv) {
      await db.update(conversations)
        .set({ lastMessageAt: new Date(), status: 'in_progress' })
        .where(eq(conversations.id, conv.id));
    } else {
      await db.insert(conversations).values({
        prospectId,
        campaignId: campaignId || null,
        status: 'in_progress',
        lastMessageAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reply tracking error:', err);
    return NextResponse.json({ error: 'Failed to record reply' }, { status: 500 });
  }
}
```

Step 3 — Inject the tracking pixel into outbound email HTML. In `app/api/messages/send/route.ts`, inside `sendMail()` (line 143), add to the `html` field:

```typescript
const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/track/open?m=${message.id}" width="1" height="1" style="display:none" />`;
const htmlWithTracking = (message.bodyHtml || message.body || '') + trackingPixel;
// use htmlWithTracking instead of message.bodyHtml in sendMail call
```

Add `NEXT_PUBLIC_APP_URL` to env vars (e.g., `https://your-domain.com` or `http://localhost:3010` for local).

**Acceptance criteria:**
- Send an email to a prospect. `GET /api/track/open?m=<messageId>` returns a 1x1 GIF and sets `opened_at` in the DB.
- `POST /api/track/reply` with `{ prospectId: 1, body: "Thanks!", channel: "email" }` creates an inbound `messages` row and sets `replied_at` on the most recent outbound message.
- Dashboard open rate and reply rate now show non-zero values.

---

### GAP-13: No Campaign-to-List Prospect Enrollment Flow

**Problem:** Campaigns have a `list_id` FK column (`db/schema.ts:11`) but the campaign execute engine never uses it. When a campaign is activated, no prospects from the linked list are automatically enrolled. `campaign_prospects` must be populated manually (via GAP-03's fix) but there is no automated enrollment from the list.

**Root cause:** `app/api/campaigns/[id]/activate/route.ts` only sets `status = 'active'` and returns. It does not check `campaigns.list_id` and does not create `campaign_prospects` rows.

**Implementation:** In `app/api/campaigns/[id]/activate/route.ts`, after the `status` update, add list-based enrollment:

```typescript
// After the campaign status update (line 19), add:
if (campaign.listId) {
  const { listMembers, campaignProspects } = await import('@/db/schema');
  const { and: andFn } = await import('drizzle-orm');

  const members = await db.select().from(listMembers)
    .where(eq(listMembers.listId, campaign.listId));

  for (const member of members) {
    const existing = await db.select().from(campaignProspects)
      .where(andFn(
        eq(campaignProspects.campaignId, campaign.id),
        eq(campaignProspects.prospectId, member.prospectId)
      ));
    if (existing.length === 0) {
      await db.insert(campaignProspects).values({
        campaignId: campaign.id,
        prospectId: member.prospectId,
        status: 'active',
      });
    }
  }
}
```

Also expose `listId` assignment in the campaign creation form (GAP-02 dialog): add a `<Select>` dropdown that fetches `/api/lists` and lets the user pick a list when creating a campaign.

**Acceptance criteria:**
- Create a list with 5 prospects.
- Create a campaign with that list selected.
- Click "Activate" on the campaign.
- `SELECT COUNT(*) FROM campaign_prospects WHERE campaign_id = <id>` returns 5.

---

## Phase 3: Polish & Completeness (MEDIUM priority)

### GAP-14: Campaign Analytics Activity Chart Uses Unix Timestamps (Wrong Comparison)

**Problem:** The per-campaign analytics endpoint generates broken SQL for the activity chart. It converts dates to Unix timestamps (seconds) and passes them to PostgreSQL timestamp comparisons, which expects full `timestamptz` values.

**Root cause:** `app/api/analytics/campaigns/[id]/route.ts`, lines 108–109:

```typescript
const dayStart = Math.floor(date.getTime() / 1000);   // Unix seconds — wrong for Postgres
const dayEnd = dayStart + 86400;
```

These integers are then used in `sql\`${messages.sentAt} >= ${dayStart}\`` against a `timestamp` column.

**Implementation:** In `app/api/analytics/campaigns/[id]/route.ts`, replace lines 106–118:

```typescript
for (let i = 13; i >= 0; i--) {
  const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
  const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  const sent = await db.select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(
      eq(messages.campaignId, campaignId),
      eq(messages.direction, 'outbound'),
      sql`${messages.sentAt} >= ${date}`,
      sql`${messages.sentAt} < ${dayEnd}`
    ));
  // ... same pattern for openedCount and repliedCount
}
```

The `date` and `dayEnd` are now JavaScript `Date` objects, which Drizzle/Neon correctly serializes to `timestamptz`.

**Acceptance criteria:**
- `GET /api/analytics/campaigns/1` returns `activityChart` with 14 entries.
- With messages sent today, today's entry has `sent > 0`.

---

### GAP-15: Dashboard "Change" Percentages Are Hardcoded Fake Numbers

**Problem:** `app/dashboard-client.tsx`, lines 120–137 show "+12%", "+8%", "+15%", "+23%" as hardcoded strings. These are meaningless to users.

**Root cause:** `app/dashboard-client.tsx:120-137` — static strings in the `metrics` array.

**Implementation:** The `/api/analytics/dashboard` endpoint should return a `previousPeriod` block alongside current metrics. Add to `app/api/analytics/dashboard/route.ts`:

```typescript
// Add: messages sent in the 7 days BEFORE last week
const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
const prevWeekMessages = await db.select({ count: sql<number>`count(*)::int` })
  .from(messages)
  .where(and(
    eq(messages.direction, 'outbound'),
    sql`${messages.sentAt} >= ${twoWeeksAgo}`,
    sql`${messages.sentAt} < ${weekAgo}`
  ));

// Include in response:
weekOverWeekChange: messagesWeek[0]?.count && prevWeekMessages[0]?.count
  ? (((messagesWeek[0].count - prevWeekMessages[0].count) / prevWeekMessages[0].count) * 100).toFixed(1)
  : null,
```

In `app/dashboard-client.tsx`, replace the hardcoded change strings with computed values from `data.metrics.weekOverWeekChange` (or show "—" if null).

**Acceptance criteria:**
- Dashboard shows real WoW change or "—" if no historical data. No more "+12%" hardcoded text.

---

### GAP-16: Email Account Credentials Stored in Plaintext

**Problem:** `app/api/settings/accounts/route.ts` line 22 stores `JSON.stringify(body.config)` directly into `connected_accounts.config_json`. This includes SMTP passwords and LinkedIn session tokens in plaintext in the database.

**Root cause:** `app/api/settings/accounts/route.ts:22` — no encryption applied before storage.

**Implementation:** Encrypt sensitive config fields before storage using AES-256-GCM via Node.js `crypto` built-in:

Create `lib/encrypt.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32-byte key, stored as 64 hex chars

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: tag.toString('hex'),
  });
}

export function decrypt(stored: string): string {
  const { iv, data, tag } = JSON.parse(stored);
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return decipher.update(Buffer.from(data, 'hex')) + decipher.final('utf8');
}
```

In `app/api/settings/accounts/route.ts`, wrap the config before insert:
```typescript
import { encrypt } from '@/lib/encrypt';
// ...
configJson: encrypt(JSON.stringify(body.config)),
```

In `app/api/messages/send/route.ts` (`sendEmail` function), decrypt before use:
```typescript
import { decrypt } from '@/lib/encrypt';
// ...
const config = JSON.parse(decrypt(account.configJson));
```

Add `ENCRYPTION_KEY` to environment variables (generate with `openssl rand -hex 32`).

**Acceptance criteria:**
- Add an email account. `SELECT config_json FROM connected_accounts LIMIT 1` returns an encrypted JSON blob, not the raw password.
- Sending an email still works (decrypts correctly at send time).

---

### GAP-17: No Prospect Tags API or UI

**Problem:** `db/schema.ts` defines `tags` (lines 153–157) and `prospect_tags` (lines 160–164) tables that are never used. No API routes, no UI components.

**Root cause:** Tables exist in schema but zero API routes exist for tags.

**Implementation:** Create `app/api/tags/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tags } from '@/db/schema';

export async function GET() {
  return NextResponse.json(await db.select().from(tags));
}

export async function POST(request: NextRequest) {
  const { name, color } = await request.json();
  const [tag] = await db.insert(tags).values({ name, color: color || '#3b82f6' }).returning();
  return NextResponse.json(tag, { status: 201 });
}
```

Create `app/api/prospects/[id]/tags/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prospectTags, tags } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select({ tag: tags })
    .from(prospectTags)
    .innerJoin(tags, eq(prospectTags.tagId, tags.id))
    .where(eq(prospectTags.prospectId, parseInt(id)));
  return NextResponse.json(rows.map(r => r.tag));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tagId } = await request.json();
  const [row] = await db.insert(prospectTags).values({
    prospectId: parseInt(id),
    tagId,
  }).returning();
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tagId } = await request.json();
  const { and } = await import('drizzle-orm');
  await db.delete(prospectTags).where(
    and(eq(prospectTags.prospectId, parseInt(id)), eq(prospectTags.tagId, tagId))
  );
  return NextResponse.json({ success: true });
}
```

In `app/prospects/prospects-client.tsx`, add a colored tag badge display in each table row.

**Acceptance criteria:**
- `POST /api/tags` creates a tag in the `tags` table.
- `POST /api/prospects/1/tags` with `{ tagId: 1 }` creates a row in `prospect_tags`.
- `GET /api/prospects/1/tags` returns the tag.

---

### GAP-18: Campaign "Settings" Tab Is a Placeholder

**Problem:** The "Settings" tab in the campaign detail (`app/campaigns/[id]/campaign-detail-client.tsx`, lines 328–333) shows only "Campaign settings coming soon...". There is no way to change the campaign name, description, assigned list, schedule, or AI persona from the campaign detail page.

**Root cause:** `app/campaigns/[id]/campaign-detail-client.tsx:328-333` — stub content, no form.

**Implementation:** Replace the placeholder content in the Settings `<TabsContent>` with a form that PUTs to `/api/campaigns/[id]`:

Add state for the settings form (name, description, listId). Fetch available lists from `/api/lists` on mount. On save, call:

```typescript
await fetch(`/api/campaigns/${campaign.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, description, listId }),
});
```

The `PUT /api/campaigns/[id]` endpoint already exists and handles all these fields (`app/api/campaigns/[id]/route.ts:20-42`).

**Acceptance criteria:**
- Open a campaign's Settings tab.
- Change name to "Renamed Campaign", click Save.
- Page header now shows "Renamed Campaign".
- `SELECT name FROM campaigns WHERE id = <id>` returns "Renamed Campaign".

---

### GAP-19: Campaign Analytics stepMetrics avgTimeHours Is Math.random()

**Problem:** `app/api/analytics/campaigns/[id]/route.ts`, line 168:
```typescript
avgTimeHours: Math.random() * 48, // TODO: Calculate actual avg time
```
This returns a random float every request. The `Step Performance` section of campaign analytics shows random useless data.

**Root cause:** `app/api/analytics/campaigns/[id]/route.ts:168` — unfinished implementation.

**Implementation:** Replace the `Math.random()` with a real calculation. The average time a prospect spends at a node is `AVG(lastActivityAt - enrolledAt)` for prospects currently at that node:

```typescript
// Replace line 168:
avgTimeHours: (() => {
  // We can't easily compute this without per-node timestamps
  // For now, compute based on campaign start vs last activity
  return 0; // real implementation requires a node_entered_at column
})(),
```

For a real implementation, add a `node_entered_at timestamp` column to `campaign_prospects` via a schema migration, set it when `currentNodeId` changes in the execute route, and then compute `AVG(EXTRACT(EPOCH FROM (NOW() - node_entered_at)) / 3600)`.

Migration SQL to add column:
```sql
ALTER TABLE campaign_prospects ADD COLUMN node_entered_at TIMESTAMP;
```

Drizzle schema change in `db/schema.ts` in the `campaignProspects` table definition:
```typescript
nodeEnteredAt: timestamp('node_entered_at'),
```

Run `npm run db:generate && npm run db:migrate`.

**Acceptance criteria:**
- `GET /api/analytics/campaigns/1` returns `stepMetrics` with `avgTimeHours` as a deterministic value (0 initially, or a real number once `node_entered_at` data exists).
- Response does NOT change between two identical requests.

---

### GAP-20: Missing Template Delete Button in UI

**Problem:** `app/templates/templates-client.tsx` imports `Trash2` icon (line 11) and includes a `handleDelete` function that calls `DELETE /api/templates/${id}`. However, examining the rendered card actions, the delete call is wired correctly but the `deleting` spinner state check uses `deleting === template.id` which only works if `setDeleting(template.id)` is called. Verify the delete button is actually rendered and wired.

Check line 80+ of `app/templates/templates-client.tsx` (beyond the read above). The `handleDelete` function should call `setDeleting(template.id)` before the fetch and `setDeleting(null)` in finally. If this is not the case, ensure the delete button in each template card is:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleDelete(template.id)}
  disabled={deleting === template.id}
  className="text-red-400 hover:text-red-300"
>
  {deleting === template.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
</Button>
```

The backend `DELETE /api/templates/[id]` already exists and works correctly (`app/api/templates/[id]/route.ts:56-68`).

**Acceptance criteria:**
- Click the trash icon on a template card.
- Template disappears from the list.
- `SELECT * FROM templates WHERE id = <id>` returns no rows.

---

### GAP-21: No Pagination on Prospects List (Performance)

**Problem:** `app/prospects/page.tsx` line 7 uses `.limit(100)` as a hard ceiling. With more than 100 prospects, older records are invisible. There is no pagination UI.

**Root cause:** `app/prospects/page.tsx:7` — `db.select().from(prospects).limit(100)`.

**Implementation:** Add `page` and `limit` query params to `GET /api/prospects`:

In `app/api/prospects/route.ts`, update the GET handler:

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    db.select().from(prospects).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(prospects),
  ]);

  return NextResponse.json({
    prospects: rows,
    total: total[0]?.count || 0,
    page,
    limit,
    pages: Math.ceil((total[0]?.count || 0) / limit),
  });
}
```

Update `app/prospects/page.tsx` to use the API response shape. Add pagination controls to `app/prospects/prospects-client.tsx`.

**Acceptance criteria:**
- `GET /api/prospects?page=1&limit=10` returns max 10 prospects and `total`, `pages` fields.
- Pagination controls in the UI navigate between pages.

---

### GAP-22: Reply Webhook Uses First Message Instead of Most Recent

**Problem:** In `app/api/conversations/[id]/reply/route.ts` line 38, even after fixing the sort order (GAP-08), the query fetches `messages` filtered only by `prospectId`. If the prospect has messages in multiple campaigns, it may pick the wrong campaign's messages to determine channel.

**Root cause:** `app/api/conversations/[id]/reply/route.ts:32-39` — no `campaignId` filter on the channel-detection query.

**Implementation:** Scope the channel detection to the conversation's `campaignId`:

```typescript
const lastMessages = await db.select()
  .from(messages)
  .where(
    conversation.campaignId
      ? and(
          eq(messages.prospectId, conversation.prospectId),
          eq(messages.campaignId, conversation.campaignId)
        )
      : eq(messages.prospectId, conversation.prospectId)
  )
  .orderBy(desc(messages.createdAt))
  .limit(1);
```

Add `import { desc, and } from 'drizzle-orm';` if not already imported.

**Acceptance criteria:**
- Prospect has email messages in Campaign A and LinkedIn messages in Campaign B.
- Replying to Campaign A's conversation uses `channel = 'email'`.
- Replying to Campaign B's conversation uses `channel = 'linkedin'`.

---

## Database Schema Reference

All tables in `db/schema.ts`:

### `campaigns`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `name` | `text` NOT NULL | |
| `description` | `text` | nullable |
| `status` | `text` NOT NULL | default `'draft'`; values: `draft`, `active`, `paused`, `completed`, `archived` |
| `schedule_json` | `text` | nullable; JSON stringified schedule object |
| `ai_persona_json` | `text` | nullable; JSON stringified persona object |
| `list_id` | `integer` | FK → `lists.id` |
| `created_at` | `timestamp` NOT NULL | default now |
| `updated_at` | `timestamp` NOT NULL | default now |

### `workflow_nodes`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `campaign_id` | `integer` NOT NULL | FK → `campaigns.id` CASCADE DELETE |
| `type` | `text` NOT NULL | values: `email`, `linkedin_message`, `linkedin_connection`, `linkedin_profile_view`, `wait`, `condition`, `ai_decision`, `manual_task`, `tag`, `move_to_campaign`, `end` |
| `label` | `text` NOT NULL | |
| `config_json` | `text` | nullable; JSON stringified node config |
| `position_x` | `real` NOT NULL | default 0 |
| `position_y` | `real` NOT NULL | default 0 |
| `created_at` | `timestamp` NOT NULL | default now |

### `workflow_edges`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `campaign_id` | `integer` NOT NULL | FK → `campaigns.id` CASCADE DELETE |
| `source_node_id` | `integer` NOT NULL | FK → `workflow_nodes.id` CASCADE DELETE |
| `target_node_id` | `integer` NOT NULL | FK → `workflow_nodes.id` CASCADE DELETE |
| `condition_json` | `text` | nullable |
| `label` | `text` | nullable |

### `lists`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `name` | `text` NOT NULL | |
| `description` | `text` | nullable |
| `type` | `text` NOT NULL | default `'static'`; values: `static`, `dynamic` |
| `filter_json` | `text` | nullable |
| `created_at` | `timestamp` NOT NULL | default now |
| `updated_at` | `timestamp` NOT NULL | default now |

### `prospects`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `first_name` | `text` NOT NULL | |
| `last_name` | `text` NOT NULL | |
| `email` | `text` | nullable |
| `company` | `text` | nullable |
| `title` | `text` | nullable |
| `linkedin_url` | `text` | nullable |
| `phone` | `text` | nullable |
| `industry` | `text` | nullable |
| `location` | `text` | nullable |
| `custom_fields_json` | `text` | nullable |
| `created_at` | `timestamp` NOT NULL | default now |
| `updated_at` | `timestamp` NOT NULL | default now |

### `list_members`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `list_id` | `integer` NOT NULL | FK → `lists.id` CASCADE DELETE |
| `prospect_id` | `integer` NOT NULL | FK → `prospects.id` CASCADE DELETE |
| `added_at` | `timestamp` NOT NULL | default now |

### `campaign_prospects`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `campaign_id` | `integer` NOT NULL | FK → `campaigns.id` CASCADE DELETE |
| `prospect_id` | `integer` NOT NULL | FK → `prospects.id` CASCADE DELETE |
| `current_node_id` | `integer` | nullable; FK → `workflow_nodes.id` |
| `status` | `text` NOT NULL | default `'active'`; values: `active`, `completed`, `paused`, `failed` |
| `enrolled_at` | `timestamp` NOT NULL | default now |
| `last_activity_at` | `timestamp` | nullable |
| `completed_at` | `timestamp` | nullable |

### `messages`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `campaign_id` | `integer` | nullable; FK → `campaigns.id` SET NULL |
| `prospect_id` | `integer` NOT NULL | FK → `prospects.id` CASCADE DELETE |
| `node_id` | `integer` | nullable; FK → `workflow_nodes.id` SET NULL |
| `channel` | `text` NOT NULL | values: `email`, `linkedin` |
| `direction` | `text` NOT NULL | values: `outbound`, `inbound` |
| `subject` | `text` | nullable |
| `body` | `text` | nullable |
| `body_html` | `text` | nullable |
| `status` | `text` NOT NULL | default `'draft'`; values: `draft`, `scheduled`, `sent`, `delivered`, `opened`, `clicked`, `replied`, `bounced`, `failed` |
| `ai_generated` | `boolean` | default false |
| `variant_id` | `integer` | nullable; FK → `template_variants.id` |
| `sent_at` | `timestamp` | nullable |
| `opened_at` | `timestamp` | nullable |
| `replied_at` | `timestamp` | nullable |
| `created_at` | `timestamp` NOT NULL | default now |

### `conversations`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `prospect_id` | `integer` NOT NULL | FK → `prospects.id` CASCADE DELETE |
| `campaign_id` | `integer` | nullable; FK → `campaigns.id` SET NULL |
| `status` | `text` NOT NULL | default `'new'`; values: `new`, `in_progress`, `interested`, `meeting_booked`, `not_interested`, `unsubscribed` |
| `last_message_at` | `timestamp` | nullable |
| `assigned_to` | `text` | nullable |

### `templates`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `name` | `text` NOT NULL | |
| `channel` | `text` NOT NULL | values: `email`, `linkedin` |
| `subject` | `text` | nullable |
| `body` | `text` NOT NULL | |
| `variables_json` | `text` | nullable |
| `created_at` | `timestamp` NOT NULL | default now |
| `updated_at` | `timestamp` NOT NULL | default now |

### `template_variants`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `template_id` | `integer` NOT NULL | FK → `templates.id` CASCADE DELETE |
| `name` | `text` NOT NULL | |
| `subject` | `text` | nullable |
| `body` | `text` NOT NULL | |
| `send_count` | `integer` | default 0 |
| `open_count` | `integer` | default 0 |
| `reply_count` | `integer` | default 0 |
| `click_count` | `integer` | default 0 |
| `is_winner` | `boolean` | default false |

### `connected_accounts`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `type` | `text` NOT NULL | values: `email`, `linkedin` |
| `name` | `text` NOT NULL | |
| `config_json` | `text` | nullable; encrypted JSON (see GAP-16) |
| `status` | `text` NOT NULL | default `'active'`; values: `active`, `disconnected`, `error` |
| `created_at` | `timestamp` NOT NULL | default now |

### `tags`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `name` | `text` NOT NULL | |
| `color` | `text` NOT NULL | default `'#3b82f6'` |

### `prospect_tags`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `prospect_id` | `integer` NOT NULL | FK → `prospects.id` CASCADE DELETE |
| `tag_id` | `integer` NOT NULL | FK → `tags.id` CASCADE DELETE |

### `settings`
| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PRIMARY KEY | |
| `key` | `text` NOT NULL UNIQUE | |
| `value` | `text` NOT NULL | JSON-stringified |
| `updated_at` | `timestamp` NOT NULL | default now |

Known `settings` keys (from `app/api/settings/general/route.ts:8-20`): `dailySendLimit`, `sendingStartHour`, `sendingEndHour`, `timezone`, `delayBetweenMessages`, `defaultModel`, `defaultTone`, `autoReply`, `maxAutoReplies`, `bannedTopics`, `webhookUrl`.

---

## API Endpoint Reference

### Existing endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns` | Create campaign. Body: `{ name, description?, status?, scheduleJson?, aiPersonaJson?, listId? }` |
| GET | `/api/campaigns/[id]` | Get campaign by ID |
| PUT | `/api/campaigns/[id]` | Update campaign. Body: `{ name, description, status, scheduleJson, aiPersonaJson, listId }` |
| DELETE | `/api/campaigns/[id]` | Delete campaign |
| POST | `/api/campaigns/[id]/activate` | Set status to `active`. Returns `{ success, campaign, message }` |
| POST | `/api/campaigns/[id]/pause` | Set status to `paused`. Returns `{ success, campaign, message }` |
| POST | `/api/campaigns/[id]/execute` | Run one cycle of the workflow engine. Returns `{ success, processed, total, errors? }` |
| GET | `/api/campaigns/[id]/workflow` | Get workflow nodes and edges. Returns `{ nodes, edges }` |
| PUT | `/api/campaigns/[id]/workflow` | Save workflow. Body: `{ nodes: ReactFlowNode[], edges: ReactFlowEdge[] }` |
| GET | `/api/prospects` | List all prospects (limit 100) |
| POST | `/api/prospects` | Create prospect. Body: `{ firstName, lastName, email?, company?, title?, linkedinUrl?, phone?, industry?, location?, customFields? }` |
| POST | `/api/prospects/import` | Bulk import. Body: `{ prospects: ProspectRow[] }` |
| GET | `/api/lists` | List all lists |
| POST | `/api/lists` | Create list. Body: `{ name, description?, type? }` |
| GET | `/api/lists/[id]/members` | Get list members (prospects) |
| GET | `/api/conversations` | List all conversations |
| POST | `/api/conversations` | Create conversation. Body: `{ prospectId, campaignId?, status?, lastMessageAt?, assignedTo? }` |
| GET | `/api/conversations/[id]` | Get conversation with messages. Returns `{ conversation, prospect, messages }` |
| PUT | `/api/conversations/[id]` | Update conversation. Body: `{ status?, assignedTo? }` |
| POST | `/api/conversations/[id]/reply` | Send reply. Body: `{ body, subject?, bodyHtml?, send?, aiGenerated?, conversationStatus? }` |
| GET | `/api/templates` | List all templates |
| POST | `/api/templates` | Create template. Body: `{ name, channel, subject?, body, variables? }` |
| GET | `/api/templates/[id]` | Get template by ID |
| PUT | `/api/templates/[id]` | Update template. Body: `{ name, channel, subject?, body, variables? }` |
| DELETE | `/api/templates/[id]` | Delete template |
| GET | `/api/templates/[id]/variants` | List variants for template |
| POST | `/api/templates/[id]/variants` | Create variant. Body: `{ name, subject?, body }` |
| PUT | `/api/templates/[id]/variants/[variantId]` | Update variant |
| DELETE | `/api/templates/[id]/variants/[variantId]` | Delete variant |
| POST | `/api/templates/[id]/variants/[variantId]/set-winner` | Mark variant as winner |
| GET | `/api/settings/accounts` | List connected accounts |
| POST | `/api/settings/accounts` | Add account. Body: `{ type, name, config: { email, password, smtpHost, smtpPort } or { sessionToken } }` |
| DELETE | `/api/settings/accounts/[id]` | Delete account |
| GET | `/api/settings/general` | Get all settings (with defaults) |
| PUT | `/api/settings/general` | Save settings. Body: partial `Settings` object |
| GET | `/api/analytics/dashboard` | Dashboard metrics, charts, recent conversations |
| GET | `/api/analytics/overview` | Simple aggregate metrics |
| GET | `/api/analytics/campaigns/[id]` | Per-campaign funnel, activity chart, step metrics, variant performance |
| GET | `/api/analytics/cross-campaign` | Cross-campaign summary, funnel, trends, template/industry/title breakdowns |
| POST | `/api/messages/ai-generate` | Generate AI message variants. Body: `{ prospectData, template?, campaignContext?, tone?, variantCount?, channel }` |
| POST | `/api/messages/ai-reply` | Generate AI reply suggestion. Body: `{ conversationHistory, prospectData, tone? }` |
| POST | `/api/messages/send` | Send or schedule a message. Body: `{ prospectId, campaignId?, nodeId?, channel, subject?, body, bodyHtml?, aiGenerated?, variantId?, scheduledAt? }` |

### Endpoints to create (from this spec)

| Method | Path | GAP | Description |
|---|---|---|---|
| GET | `/api/prospects/[id]` | GAP-05 | Get single prospect |
| PUT | `/api/prospects/[id]` | GAP-05 | Update prospect |
| DELETE | `/api/prospects/[id]` | GAP-05 | Delete prospect |
| POST | `/api/lists/[id]/members` | GAP-06 | Add prospects to list. Body: `{ prospectIds: number[] }` |
| DELETE | `/api/lists/[id]/members` | GAP-06 | Remove prospect from list. Body: `{ prospectId: number }` |
| GET | `/api/lists/[id]` | GAP-06 | Get list by ID |
| DELETE | `/api/lists/[id]` | GAP-06 | Delete list |
| POST | `/api/campaigns/[id]/prospects` | GAP-03/GAP-13 | Enroll prospects. Body: `{ prospectIds: number[] }` |
| GET | `/api/campaigns/[id]/prospects` | GAP-03 | List enrolled prospects |
| GET | `/api/track/open` | GAP-12 | Email open tracking pixel. Query: `?m=<messageId>` |
| POST | `/api/track/reply` | GAP-12 | Record inbound reply. Body: `{ messageId?, prospectId, campaignId?, body, channel }` |
| GET | `/api/tags` | GAP-17 | List all tags |
| POST | `/api/tags` | GAP-17 | Create tag. Body: `{ name, color? }` |
| GET | `/api/prospects/[id]/tags` | GAP-17 | Get tags for prospect |
| POST | `/api/prospects/[id]/tags` | GAP-17 | Add tag to prospect. Body: `{ tagId: number }` |
| DELETE | `/api/prospects/[id]/tags` | GAP-17 | Remove tag from prospect. Body: `{ tagId: number }` |

---

## Environment Variables

All vars are required unless marked optional.

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `OPENAI_API_KEY` | OpenAI API key (optional — fallback templates used if missing) | `sk-...` |
| `SMTP_HOST` | Fallback SMTP host (used if no connected account is configured) | `smtp.gmail.com` |
| `SMTP_PORT` | Fallback SMTP port | `587` |
| `SMTP_USER` | Fallback SMTP username | `you@gmail.com` |
| `SMTP_PASS` | Fallback SMTP password or app password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Fallback sender address | `"Your Name <you@gmail.com>"` |
| `ENCRYPTION_KEY` | 32-byte hex key for credential encryption (GAP-16) | output of `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | Public base URL for tracking pixel links (GAP-12) | `https://yourdomain.com` |

Create `.env.local` in the repo root (already in `.gitignore`). Run `npm run db:migrate` after setting `DATABASE_URL`.
