import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Campaigns
export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'), // draft, active, paused, completed, archived
  scheduleJson: text('schedule_json'),
  aiPersonaJson: text('ai_persona_json'),
  listId: integer('list_id').references(() => lists.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Workflow Nodes
export const workflowNodes = sqliteTable('workflow_nodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // email, linkedin_message, linkedin_connection, linkedin_profile_view, wait, condition, ai_decision, manual_task, tag, move_to_campaign, end
  label: text('label').notNull(),
  configJson: text('config_json'),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Workflow Edges
export const workflowEdges = sqliteTable('workflow_edges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  sourceNodeId: integer('source_node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  targetNodeId: integer('target_node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  conditionJson: text('condition_json'),
  label: text('label'),
});

// Lists
export const lists = sqliteTable('lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().default('static'), // static, dynamic
  filterJson: text('filter_json'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Prospects
export const prospects = sqliteTable('prospects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// List Members
export const listMembers = sqliteTable('list_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listId: integer('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Campaign Prospects
export const campaignProspects = sqliteTable('campaign_prospects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  currentNodeId: integer('current_node_id').references(() => workflowNodes.id),
  status: text('status').notNull().default('active'), // active, completed, paused, failed
  enrolledAt: integer('enrolled_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Messages
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  nodeId: integer('node_id').references(() => workflowNodes.id, { onDelete: 'set null' }),
  channel: text('channel').notNull(), // email, linkedin
  direction: text('direction').notNull(), // outbound, inbound
  subject: text('subject'),
  body: text('body'),
  bodyHtml: text('body_html'),
  status: text('status').notNull().default('draft'), // draft, scheduled, sent, delivered, opened, clicked, replied, bounced, failed
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).default(false),
  variantId: integer('variant_id').references(() => templateVariants.id),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  openedAt: integer('opened_at', { mode: 'timestamp' }),
  repliedAt: integer('replied_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Conversations
export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('new'), // new, in_progress, interested, meeting_booked, not_interested, unsubscribed
  lastMessageAt: integer('last_message_at', { mode: 'timestamp' }),
  assignedTo: text('assigned_to'),
});

// Templates
export const templates = sqliteTable('templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  channel: text('channel').notNull(), // email, linkedin
  subject: text('subject'),
  body: text('body').notNull(),
  variablesJson: text('variables_json'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Template Variants
export const templateVariants = sqliteTable('template_variants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  templateId: integer('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  sendCount: integer('send_count').default(0),
  openCount: integer('open_count').default(0),
  replyCount: integer('reply_count').default(0),
  clickCount: integer('click_count').default(0),
  isWinner: integer('is_winner', { mode: 'boolean' }).default(false),
});

// Connected Accounts
export const connectedAccounts = sqliteTable('connected_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // email, linkedin
  name: text('name').notNull(),
  configJson: text('config_json'),
  status: text('status').notNull().default('active'), // active, disconnected, error
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Tags
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
});

// Prospect Tags
export const prospectTags = sqliteTable('prospect_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

// Settings (key-value store)
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
