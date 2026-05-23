import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { campaigns, campaignProspects, workflowNodes, workflowEdges, messages, prospects, prospectTags, tags, tasks } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { sendEmail } from '@/lib/email-sender';
import { sendLinkedInMessage, sendLinkedInConnection } from '@/lib/linkedin-sender';
import OpenAI from 'openai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const campaignId = parseInt(id);

    // Get campaign (scoped to userId)
    const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'active') {
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    }

    // Get all enrolled prospects for this campaign
    const enrolledProspects = await db.select({
      campaignProspect: campaignProspects,
      prospect: prospects,
    })
      .from(campaignProspects)
      .innerJoin(prospects, eq(campaignProspects.prospectId, prospects.id))
      .where(and(
        eq(campaignProspects.campaignId, campaignId),
        eq(campaignProspects.status, 'active')
      ));

    // Get workflow nodes and edges
    const nodes = await db.select().from(workflowNodes).where(eq(workflowNodes.campaignId, campaignId));
    const edges = await db.select().from(workflowEdges).where(eq(workflowEdges.campaignId, campaignId));

    let processedCount = 0;
    const errors: string[] = [];

    // Process each prospect
    for (const { campaignProspect, prospect } of enrolledProspects) {
      try {
        await processProspectStep(campaignId, campaign.userId, campaignProspect, prospect, nodes, edges);
        processedCount++;
      } catch (err) {
        console.error(`Error processing prospect ${prospect.id}:`, err);
        errors.push(`Prospect ${prospect.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: enrolledProspects.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Execute campaign error:', err);
    return NextResponse.json({ 
      error: 'Failed to execute campaign',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

interface CampaignProspect {
  id: number;
  currentNodeId: number | null;
  lastActivityAt: Date | null;
}

interface Prospect {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  industry: string | null;
  location: string | null;
}

interface WorkflowNode {
  id: number;
  type: string;
  configJson: string | null;
}

interface WorkflowEdge {
  sourceNodeId: number;
  targetNodeId: number;
  conditionJson: string | null;
  label: string | null;
}

async function processProspectStep(
  campaignId: number,
  userId: string,
  campaignProspect: CampaignProspect,
  prospect: Prospect,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
) {
  // If no current node, find the start node
  let currentNodeId = campaignProspect.currentNodeId;
  
  if (!currentNodeId) {
    // Find start node (node with no incoming edges)
    const nodeIds = new Set(nodes.map(n => n.id));
    const targetIds = new Set(edges.map(e => e.targetNodeId));
    const startNodeId = Array.from(nodeIds).find(id => !targetIds.has(id));
    
    if (!startNodeId) {
      throw new Error('No start node found in workflow');
    }
    
    currentNodeId = startNodeId;
  }

  const currentNode = nodes.find(n => n.id === currentNodeId);
  if (!currentNode) {
    throw new Error(`Node ${currentNodeId} not found`);
  }

  let conditionResult: boolean | null = null;

  // Process the current node
  try {
    await executeNode(campaignId, userId, campaignProspect, prospect, currentNode);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CONDITION_FALSE')) {
      conditionResult = false;
    } else if (err instanceof Error && (err.message === 'MANUAL_TASK_CREATED' || err.message === 'Wait period not complete')) {
      return; // Stop processing, resume later
    } else {
      throw err;
    }
  }

  if (conditionResult === null) conditionResult = true;

  // Find next node — for conditions, follow 'yes'/'no' label
  const outgoingEdges = edges.filter(e => e.sourceNodeId === currentNodeId);
  let nextEdge: typeof outgoingEdges[0] | undefined;

  if (currentNode.type === 'condition' || currentNode.type === 'ai_decision') {
    // Route based on condition result
    nextEdge = outgoingEdges.find(e => e.label === (conditionResult ? 'yes' : 'no')) || outgoingEdges[0];
  } else {
    nextEdge = outgoingEdges[0];
    if (nextEdge?.conditionJson) {
      const condition = JSON.parse(nextEdge.conditionJson);
      const conditionMet = await evaluateCondition(condition, prospect);
      if (!conditionMet) return;
    }
  }

  if (nextEdge) {
    await db.update(campaignProspects)
      .set({ currentNodeId: nextEdge.targetNodeId, lastActivityAt: new Date() })
      .where(eq(campaignProspects.id, campaignProspect.id));
  } else {
    await db.update(campaignProspects)
      .set({ status: 'completed', completedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(campaignProspects.id, campaignProspect.id));
  }
}

async function executeNode(campaignId: number, userId: string, campaignProspect: CampaignProspect, prospect: Prospect, node: WorkflowNode) {
  const config = node.configJson ? JSON.parse(node.configJson) : {};

  switch (node.type) {
    case 'email': {
      const subject = config.subject ? replaceVariables(config.subject, prospect) : '';
      const body = replaceVariables(config.body || '', prospect);
      await sendEmail({ to: prospect.email || '', subject, text: body });
      await db.insert(messages).values({
        userId,
        campaignId,
        prospectId: prospect.id,
        nodeId: node.id,
        channel: 'email',
        direction: 'outbound',
        subject,
        body,
        status: 'sent',
        sentAt: new Date(),
        openedAt: null,
        repliedAt: null,
      });
      break;
    }

    case 'linkedin_message': {
      const message = replaceVariables(config.message || config.body || '', prospect);
      await sendLinkedInMessage('stub-member', prospect.linkedinUrl || '', message, 'stub-token', 'stub-ua');
      await db.insert(messages).values({
        userId,
        campaignId,
        prospectId: prospect.id,
        nodeId: node.id,
        channel: 'linkedin',
        direction: 'outbound',
        body: message,
        status: 'sent',
        sentAt: new Date(),
        openedAt: null,
        repliedAt: null,
      });
      break;
    }

    case 'linkedin_connection':
    case 'linkedin_profile_view': {
      const msg = replaceVariables(config.message || '', prospect);
      await sendLinkedInConnection('stub-member', prospect.linkedinUrl || '', msg, 'stub-token', 'stub-ua');
      await db.insert(messages).values({
        userId,
        campaignId,
        prospectId: prospect.id,
        nodeId: node.id,
        channel: 'linkedin',
        direction: 'outbound',
        body: msg || `[${node.type}]`,
        status: 'sent',
        sentAt: new Date(),
        openedAt: null,
        repliedAt: null,
      });
      break;
    }

    case 'wait': {
      const waitHours = config.duration || config.hours || 24;
      const nextRunAt = new Date(Date.now() + waitHours * 60 * 60 * 1000);
      await db.update(campaignProspects)
        .set({ nextRunAt, lastActivityAt: new Date() })
        .where(eq(campaignProspects.id, campaignProspect.id));
      // Don't advance — cron will resume after wait
      throw new Error('Wait period not complete');
    }

    case 'condition': {
      const conditionType = config.conditionType || 'message_opened';
      let result = false;
      if (conditionType === 'message_opened' || conditionType === 'email_opened') {
        const opened = await db.select({ id: messages.id }).from(messages)
          .where(and(eq(messages.prospectId, prospect.id), isNotNull(messages.openedAt))).limit(1);
        result = opened.length > 0;
      } else if (conditionType === 'replied' || conditionType === 'email_replied' || conditionType === 'linkedin_replied') {
        const replied = await db.select({ id: messages.id }).from(messages)
          .where(and(eq(messages.prospectId, prospect.id), isNotNull(messages.repliedAt))).limit(1);
        result = replied.length > 0;
      }
      // Store condition result so processProspectStep can route yes/no
      // We use a special error to signal branching
      if (!result) {
        throw new Error(`CONDITION_FALSE:${conditionType}`);
      }
      break;
    }

    case 'tag': {
      const tagName = config.tagName || 'untagged';
      // Find or create tag
      let [tag] = await db.select().from(tags).where(and(eq(tags.userId, userId), eq(tags.name, tagName))).limit(1);
      if (!tag) {
        [tag] = await db.insert(tags).values({ userId, name: tagName }).returning();
      }
      if (config.action === 'remove') {
        await db.delete(prospectTags).where(and(
          eq(prospectTags.prospectId, prospect.id),
          eq(prospectTags.tagId, tag.id)
        ));
      } else {
        const existing = await db.select().from(prospectTags).where(and(
          eq(prospectTags.prospectId, prospect.id),
          eq(prospectTags.tagId, tag.id)
        )).limit(1);
        if (existing.length === 0) {
          await db.insert(prospectTags).values({ prospectId: prospect.id, tagId: tag.id });
        }
      }
      break;
    }

    case 'move_to_campaign': {
      const targetCampaignId = config.campaignId;
      if (targetCampaignId) {
        const existing = await db.select().from(campaignProspects).where(and(
          eq(campaignProspects.campaignId, targetCampaignId),
          eq(campaignProspects.prospectId, prospect.id)
        )).limit(1);
        if (existing.length === 0) {
          await db.insert(campaignProspects).values({
            campaignId: targetCampaignId,
            prospectId: prospect.id,
            status: 'pending',
          });
        }
      }
      break;
    }

    case 'ai_decision': {
      const prompt = config.prompt || 'Should we continue outreach?';
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `${prompt}\n\nProspect: ${prospect.firstName} ${prospect.lastName}, ${prospect.title || ''} at ${prospect.company || ''}. Reply with YES or NO only.`
          }],
          max_tokens: 10,
        });
        const answer = completion.choices[0]?.message?.content?.trim().toUpperCase() || 'YES';
        if (answer.startsWith('NO')) {
          throw new Error('CONDITION_FALSE:ai_decision');
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('CONDITION_FALSE')) throw err;
        console.log('AI decision fallback: YES');
      }
      break;
    }

    case 'manual_task': {
      // Create task record and pause prospect
      await db.insert(tasks).values({
        campaignProspectId: campaignProspect.id,
        description: config.description || 'Manual task required',
        status: 'pending',
      });
      await db.update(campaignProspects)
        .set({ status: 'paused' })
        .where(eq(campaignProspects.id, campaignProspect.id));
      throw new Error('MANUAL_TASK_CREATED');
    }

    case 'end':
      await db.update(campaignProspects)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(campaignProspects.id, campaignProspect.id));
      break;

    default:
      console.log(`Node type ${node.type} not yet implemented`);
  }
}

async function evaluateCondition(condition: { type: string; value?: unknown }, prospect: Prospect): Promise<boolean> {
  // Evaluate condition based on message status, prospect data, etc.
  const { type } = condition;

  switch (type) {
    case 'message_opened':
      // Check if any message has been opened
      const openedMessages = await db.select()
        .from(messages)
        .where(and(
          eq(messages.prospectId, prospect.id),
          eq(messages.status, 'opened')
        ));
      return openedMessages.length > 0;

    case 'message_replied':
      const repliedMessages = await db.select()
        .from(messages)
        .where(and(
          eq(messages.prospectId, prospect.id),
          eq(messages.status, 'replied')
        ));
      return repliedMessages.length > 0;

    case 'message_clicked':
      const clickedMessages = await db.select()
        .from(messages)
        .where(and(
          eq(messages.prospectId, prospect.id),
          eq(messages.status, 'clicked')
        ));
      return clickedMessages.length > 0;

    default:
      console.log(`Condition type ${type} not yet implemented`);
      return true; // Default to true for unimplemented conditions
  }
}

function replaceVariables(text: string, prospect: Prospect): string {
  return text
    .replace(/\{\{first_name\}\}/g, prospect.firstName || '')
    .replace(/\{\{last_name\}\}/g, prospect.lastName || '')
    .replace(/\{\{company\}\}/g, prospect.company || '')
    .replace(/\{\{title\}\}/g, prospect.title || '')
    .replace(/\{\{email\}\}/g, prospect.email || '')
    .replace(/\{\{phone\}\}/g, prospect.phone || '')
    .replace(/\{\{industry\}\}/g, prospect.industry || '')
    .replace(/\{\{location\}\}/g, prospect.location || '');
}
