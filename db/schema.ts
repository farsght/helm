import { pgTable, text, integer, real, serial, timestamp, boolean } from 'drizzle-orm/pg-core';

// Campaigns
export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'), // draft, active, paused, completed, archived
  scheduleJson: text('schedule_json'),
  aiPersonaJson: text('ai_persona_json'),
  listId: integer('list_id').references(() => lists.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Workflow Nodes
export const workflowNodes = pgTable('workflow_nodes', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // email, linkedin_message, linkedin_connection, linkedin_profile_view, wait, condition, ai_decision, manual_task, tag, move_to_campaign, end
  label: text('label').notNull(),
  configJson: text('config_json'),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Workflow Edges
export const workflowEdges = pgTable('workflow_edges', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  sourceNodeId: integer('source_node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  targetNodeId: integer('target_node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  conditionJson: text('condition_json'),
  label: text('label'),
});

// Lists
export const lists = pgTable('lists', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().default('static'), // static, dynamic
  filterJson: text('filter_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Prospects
export const prospects = pgTable('prospects', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  company: text('company'),
  title: text('title'),
  linkedinUrl: text('linkedin_url'),
  phone: text('phone'),
  industry: text('industry'),
  location: text('location'),
  customFieldsJson: text('custom_fields_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// List Members
export const listMembers = pgTable('list_members', {
  id: serial('id').primaryKey(),
  listId: integer('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').notNull().defaultNow(),
});

// Campaign Prospects
export const campaignProspects = pgTable('campaign_prospects', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  currentNodeId: integer('current_node_id').references(() => workflowNodes.id),
  status: text('status').notNull().default('active'), // active, pending, completed, paused, failed
  enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at'),
  completedAt: timestamp('completed_at'),
  nextRunAt: timestamp('next_run_at'),
});

// Messages
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  nodeId: integer('node_id').references(() => workflowNodes.id, { onDelete: 'set null' }),
  channel: text('channel').notNull(), // email, linkedin
  direction: text('direction').notNull(), // outbound, inbound
  subject: text('subject'),
  body: text('body'),
  bodyHtml: text('body_html'),
  status: text('status').notNull().default('draft'), // draft, scheduled, sent, delivered, opened, clicked, replied, bounced, failed
  aiGenerated: boolean('ai_generated').default(false),
  variantId: integer('variant_id').references(() => templateVariants.id),
  sentAt: timestamp('sent_at'),
  openedAt: timestamp('opened_at'),
  repliedAt: timestamp('replied_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Conversations
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('new'), // new, in_progress, interested, meeting_booked, not_interested, unsubscribed
  lastMessageAt: timestamp('last_message_at'),
  assignedTo: text('assigned_to'),
});

// Templates
export const templates = pgTable('templates', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  channel: text('channel').notNull(), // email, linkedin
  subject: text('subject'),
  body: text('body').notNull(),
  variablesJson: text('variables_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Template Variants
export const templateVariants = pgTable('template_variants', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  sendCount: integer('send_count').default(0),
  openCount: integer('open_count').default(0),
  replyCount: integer('reply_count').default(0),
  clickCount: integer('click_count').default(0),
  isWinner: boolean('is_winner').default(false),
});

// Connected Accounts
export const connectedAccounts = pgTable('connected_accounts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  type: text('type').notNull(), // email, linkedin
  name: text('name').notNull(),
  configJson: text('config_json'),
  status: text('status').notNull().default('active'), // active, disconnected, error
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tags
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
});

// Prospect Tags
export const prospectTags = pgTable('prospect_tags', {
  id: serial('id').primaryKey(),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

// Tasks (for manual_task workflow nodes)
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  campaignProspectId: integer('campaign_prospect_id').notNull().references(() => campaignProspects.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'), // pending, completed
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Settings (key-value store)
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
