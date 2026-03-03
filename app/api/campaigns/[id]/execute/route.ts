import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns, campaignProspects, workflowNodes, workflowEdges, messages, prospects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);

    // Get campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
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
        await processProspectStep(campaignId, campaignProspect, prospect, nodes, edges);
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
}

async function processProspectStep(
  campaignId: number,
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

  // Process the current node
  await executeNode(campaignId, campaignProspect, prospect, currentNode);

  // Find next node
  const nextEdge = edges.find(e => e.sourceNodeId === currentNodeId);
  
  if (nextEdge) {
    // Check if condition needs to be evaluated
    if (nextEdge.conditionJson) {
      const condition = JSON.parse(nextEdge.conditionJson);
      const conditionMet = await evaluateCondition(condition, prospect);
      
      if (!conditionMet) {
        // Find alternative path or stop
        return;
      }
    }

    // Move to next node
    await db.update(campaignProspects)
      .set({
        currentNodeId: nextEdge.targetNodeId,
        lastActivityAt: new Date(),
      })
      .where(eq(campaignProspects.id, campaignProspect.id));
  } else {
    // No more nodes, mark as completed
    await db.update(campaignProspects)
      .set({
        status: 'completed',
        completedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(campaignProspects.id, campaignProspect.id));
  }
}

async function executeNode(campaignId: number, campaignProspect: CampaignProspect, prospect: Prospect, node: WorkflowNode) {
  const config = node.configJson ? JSON.parse(node.configJson) : {};

  switch (node.type) {
    case 'email':
    case 'linkedin_message':
      // Create message (will be sent by send endpoint)
      await db.insert(messages).values({
        campaignId,
        prospectId: prospect.id,
        nodeId: node.id,
        channel: node.type === 'email' ? 'email' : 'linkedin',
        direction: 'outbound',
        subject: config.subject ? replaceVariables(config.subject, prospect) : undefined,
        body: replaceVariables(config.body || config.message || '', prospect),
        status: 'scheduled',
      });
      break;

    case 'wait':
      // Update last activity time; prospect will stay here until wait period passes
      const waitHours = config.hours || 24;
      
      // Check if wait period has passed
      if (campaignProspect.lastActivityAt) {
        const lastActivity = new Date(campaignProspect.lastActivityAt);
        if (Date.now() - lastActivity.getTime() < waitHours * 60 * 60 * 1000) {
          // Wait period not over yet, don't proceed
          throw new Error('Wait period not complete');
        }
      }
      break;

    case 'end':
      await db.update(campaignProspects)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(campaignProspects.id, campaignProspect.id));
      break;

    // Add more node types as needed
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
