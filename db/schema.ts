import { pgTable, text, integer, real, serial, timestamp, boolean, uniqueIndex, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Campaigns
export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'), // draft, active, paused, completed, archived
  scheduleJson: text('schedule_json'),
  aiPersonaJson: text('ai_persona_json'),
  segmentId: integer('segment_id').references(() => segments.id),
  /**
   * Optional campaign id to invoke when ANY node in this campaign's workflow
   * throws an error. The error-handler campaign receives the failing prospect
   * and the error context as variables. If null, errors just mark the
   * prospect 'failed' and stop. Set per-campaign in Settings → Error handler.
   */
  errorHandlerCampaignId: integer('error_handler_campaign_id'),
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

// Segments
export const segments = pgTable('segments', {
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
  companyWebsite: text('company_website'),
  companyLinkedinUrl: text('company_linkedin_url'),
  phone: text('phone'),
  industry: text('industry'),
  location: text('location'),
  customFieldsJson: text('custom_fields_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// List Members
export const segmentMembers = pgTable('segment_members', {
  id: serial('id').primaryKey(),
  segmentId: integer('segment_id').notNull().references(() => segments.id, { onDelete: 'cascade' }),
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
  userId: text('user_id').notNull().default(''),
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
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
}, (table) => [
  uniqueIndex('tags_user_id_name_unique').on(table.userId, table.name),
]);

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
  userId: text('user_id').notNull().default(''),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('settings_user_id_key_unique').on(table.userId, table.key),
]);

// ── Datasets ─────────────────────────────────────────────────────────
// Staging workspace for raw data (CSV uploads, Sheets, HubSpot, etc.).
// Rows live as JSONB so we don't need DDL per import. Schema metadata
// for each dataset is captured in `columnSchemaJson`.
export const datasets = pgTable('datasets', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  source: text('source').notNull().default('csv'), // csv, google_sheets, hubspot_contacts, hubspot_companies, webhook, manual
  sourceMetaJson: jsonb('source_meta_json'), // { filename, sheetId, hubspotPortalId, ... }
  columnSchemaJson: jsonb('column_schema_json'), // [{ key, label, type: 'string'|'number'|'date'|'boolean', sample }]
  rowCount: integer('row_count').notNull().default(0),
  status: text('status').notNull().default('ready'), // importing, ready, error
  errorMessage: text('error_message'),
  refreshedAt: timestamp('refreshed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const datasetRows = pgTable('dataset_rows', {
  id: serial('id').primaryKey(),
  datasetId: integer('dataset_id').notNull().references(() => datasets.id, { onDelete: 'cascade' }),
  externalId: text('external_id'), // source-specific id (HubSpot contact id, sheet row index, etc.)
  rowJson: jsonb('row_json').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('dataset_rows_dataset_id_idx').on(t.datasetId),
]);

// ── CRM: Companies, Contacts, Deals ────────────────────────────────────
// v1 CRM entities. Sits alongside `prospects` (which remains the
// top-of-funnel sourced-lead bucket). Promote prospects → contacts later.

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  domain: text('domain'),                                    // primary dedupe key
  industry: text('industry'),
  employeeCount: integer('employee_count'),
  sizeBand: text('size_band'),                               // '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'
  website: text('website'),
  linkedinUrl: text('linkedin_url'),
  location: text('location'),
  description: text('description'),
  customFieldsJson: jsonb('custom_fields_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('companies_user_id_idx').on(t.userId),
  index('companies_domain_idx').on(t.domain),
]);

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  companyId: integer('company_id').references(() => companies.id, { onDelete: 'set null' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  title: text('title'),
  linkedinUrl: text('linkedin_url'),
  phone: text('phone'),
  location: text('location'),
  lifecycleStage: text('lifecycle_stage').notNull().default('lead'), // lead, mql, sql, opportunity, customer, evangelist, other
  ownerId: text('owner_id'),                                  // optional, future multi-user
  customFieldsJson: jsonb('custom_fields_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('contacts_user_id_idx').on(t.userId),
  index('contacts_company_id_idx').on(t.companyId),
  index('contacts_email_idx').on(t.email),
]);

export const deals = pgTable('deals', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  companyId: integer('company_id').references(() => companies.id, { onDelete: 'set null' }),
  primaryContactId: integer('primary_contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  stage: text('stage').notNull().default('discovery'), // discovery, qualified, proposal, negotiation, closed_won, closed_lost
  amountCents: integer('amount_cents'),                       // store as integer cents to avoid float drift
  currency: text('currency').notNull().default('USD'),
  probability: integer('probability'),                        // 0-100, optional
  expectedCloseDate: timestamp('expected_close_date'),
  closedAt: timestamp('closed_at'),
  source: text('source'),                                     // referral, outbound, inbound, partner, ...
  ownerId: text('owner_id'),
  description: text('description'),
  customFieldsJson: jsonb('custom_fields_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('deals_user_id_idx').on(t.userId),
  index('deals_company_id_idx').on(t.companyId),
  index('deals_stage_idx').on(t.stage),
]);

// Many-to-many between deals and contacts (a deal can have multiple stakeholders,
// a contact can be on multiple deals).
export const dealContacts = pgTable('deal_contacts', {
  id: serial('id').primaryKey(),
  dealId: integer('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  contactId: integer('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  role: text('role'),                                         // champion, decision_maker, influencer, blocker, end_user
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('deal_contacts_deal_contact_unique').on(t.dealId, t.contactId),
  index('deal_contacts_deal_id_idx').on(t.dealId),
  index('deal_contacts_contact_id_idx').on(t.contactId),
]);

// ── Pipelines ────────────────────────────────────────────────────────
export const pipelines = pgTable('pipelines', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'), // draft, active, archived
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const pipelineNodes = pgTable('pipeline_nodes', {
  id: serial('id').primaryKey(),
  pipelineId: integer('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // source_dataset, map_fields, filter, clean, deduplicate, enrich, ai_classify, split, run_notebook, promote_prospects, promote_companies, promote_contacts, promote_deals, promote_segment
  label: text('label').notNull(),
  configJson: text('config_json'),
  /**
   * Trigger config — only consulted for SOURCE nodes (nodes with zero in-edges).
   * Shape: { kind: 'manual' | 'cron' | 'webhook' | 'event', ...kindSpecificFields }.
   * Defaults to {"kind":"manual"} for back-compat. See lib/pipeline-engine.ts for
   * the trigger model; intermediate nodes always fire when upstream completes.
   */
  triggerConfig: jsonb('trigger_config').notNull().default(sql`'{"kind":"manual"}'::jsonb`),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const pipelineEdges = pgTable('pipeline_edges', {
  id: serial('id').primaryKey(),
  pipelineId: integer('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  sourceNodeId: integer('source_node_id').notNull().references(() => pipelineNodes.id, { onDelete: 'cascade' }),
  targetNodeId: integer('target_node_id').notNull().references(() => pipelineNodes.id, { onDelete: 'cascade' }),
  label: text('label'),
});

export const pipelineRuns = pgTable('pipeline_runs', {
  id: serial('id').primaryKey(),
  pipelineId: integer('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('running'), // running, completed, failed
  rowsInput: integer('rows_input').default(0),
  rowsOutput: integer('rows_output').default(0),
  rowsErrored: integer('rows_errored').default(0),
  logJson: text('log_json'), // array of { nodeId, message, level }
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
});

// ── Notebooks ────────────────────────────────────────────────────────
export const notebooks = pgTable('notebooks', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  language: text('language').notNull().default('javascript'), // javascript, python
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notebookCells = pgTable('notebook_cells', {
  id: serial('id').primaryKey(),
  notebookId: integer('notebook_id').notNull().references(() => notebooks.id, { onDelete: 'cascade' }),
  cellIndex: integer('cell_index').notNull().default(0),
  language: text('language').notNull().default('javascript'), // javascript, python
  code: text('code').notNull().default(''),
  outputJson: text('output_json'), // last run output
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── Agents ──────────────────────────────────────────────────────────
// Agent definitions are reusable AI personas with prompts, models, and
// (in increment 2) skills + MCP server connections. Consumed by:
//   - workflow_nodes (type='ai_agent') — campaign + ops automation
//   - conversations  — triage/reply drafting (future)
//   - dataset_rows   — per-row enrichment (future)
//   - cron jobs      — scheduled runs (future)
//   - direct chat    — talk to your agent (future)

export const agentDefinitions = pgTable('agent_definitions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  /**
   * Model identifier in "provider:model" form, e.g. "openai:gpt-4o-mini"
   * or "anthropic:claude-3-5-sonnet-20241022". The runtime parses this.
   */
  model: text('model').notNull().default('openai:gpt-4o-mini'),
  systemPrompt: text('system_prompt').notNull().default(''),
  /**
   * User prompt template. Supports {{firstName}} {{lastName}} {{company}}
   * {{title}} {{email}} and contextual {{lastMessage}} / {{custom_*}}.
   */
  userPromptTemplate: text('user_prompt_template').notNull().default(''),
  /**
   * JSON: { temperature?: number, maxTokens?: number, topP?: number }
   * Stored as text for portability; runtime parses.
   */
  modelParamsJson: text('model_params_json'),
  /**
   * JSON: { decisions: string[] } — the allowed output choices. Workflow
   * branches on the returned decision. Edge labels on an ai_agent node
   * must match exactly one of these decisions. v1 supports `decisions`
   * only; future: arbitrary structured output schemas.
   */
  outputSchemaJson: text('output_schema_json').notNull().default('{"decisions":["continue","stop"]}'),
  /**
   * Max turns in the tool-use loop. v1 has no tools, so this is unused
   * but persisted for forward-compat. Default 5.
   */
  maxTurns: integer('max_turns').notNull().default(5),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Every agent invocation across the platform — observability + audit trail.
export const agentRuns = pgTable('agent_runs', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull().references(() => agentDefinitions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().default(''),
  /**
   * Where this run was invoked from. e.g. 'workflow_node', 'manual',
   * 'conversation', 'cron', 'dataset_row', 'api'.
   */
  invokedByType: text('invoked_by_type').notNull(),
  /** Foreign id into the invoking table. Convention; not FK-enforced. */
  invokedById: integer('invoked_by_id'),
  status: text('status').notNull().default('running'), // running, completed, failed
  /** JSON: the full input context the agent saw (prompts after rendering). */
  inputJson: text('input_json'),
  /** Final decision string (one of agent.outputSchema.decisions). */
  decision: text('decision'),
  /** Free-form reasoning text the model produced. */
  reasoning: text('reasoning'),
  /** JSON array of tool calls in v1.5+; empty in v1. */
  toolCallsJson: text('tool_calls_json'),
  /** Total tokens used across all turns. */
  tokensUsed: integer('tokens_used'),
  /** Cost estimate in cents (provider-dependent). */
  costCents: integer('cost_cents'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('agent_runs_agent_id_idx').on(table.agentId),
  index('agent_runs_started_at_idx').on(table.startedAt),
]);

// ── Agent Skills (procedural knowledge) ─────────────────────────────
// Skills are reusable markdown blocks that get loaded into an agent's
// system prompt. Small (typically <10KB). For larger corpora that need
// retrieval (RAG), use agent_resources (Tier 2) instead.
//
// Skills are user-scoped and many-to-many with agents via agent_skill_links.

export const agentSkills = pgTable('agent_skills', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  /**
   * Markdown body. Stuffed into system prompt verbatim when attached.
   * Soft limit ~10KB; over that, RAG via agent_resources is preferred.
   */
  body: text('body').notNull().default(''),
  /**
   * Optional category for org (e.g. 'qualification', 'voice', 'objection-handling').
   */
  category: text('category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const agentSkillLinks = pgTable('agent_skill_links', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull().references(() => agentDefinitions.id, { onDelete: 'cascade' }),
  skillId: integer('skill_id').notNull().references(() => agentSkills.id, { onDelete: 'cascade' }),
  /** Order in which skills are concatenated into the system prompt. */
  position: integer('position').notNull().default(0),
}, (table) => [
  index('agent_skill_links_agent_id_idx').on(table.agentId),
  uniqueIndex('agent_skill_links_unique').on(table.agentId, table.skillId),
]);

// ── MCP Servers (tool surfaces for agents) ──────────────────────────
// HTTP MCP servers expose tools that agents can call during their
// tool-use loop. v1 supports HTTP transport only (no stdio).
//
// Same provider may also exist as a Connection (Type A — deterministic
// platform integration). MCP server entries are Type B — agent-mediated,
// non-deterministic, runtime tool calls.

export const mcpServers = pgTable('mcp_servers', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  description: text('description'),
  /** v1: "http" (JSON-RPC over HTTP+SSE). Future: "stdio". */
  transport: text('transport').notNull().default('http'),
  url: text('url').notNull(),
  /**
   * JSON object of headers (e.g. {"Authorization": "Bearer ..."}).
   * Stored as text for portability; secrets should be set via env-var
   * substitution at runtime (e.g. "Bearer ${HUBSPOT_TOKEN}").
   */
  authHeadersJson: text('auth_headers_json'),
  /**
   * Cached tool list (JSON array). Populated by the introspection
   * endpoint when the server is added or refreshed. Used to render
   * tool pickers without re-querying.
   */
  toolsCacheJson: text('tools_cache_json'),
  toolsCachedAt: timestamp('tools_cached_at'),
  /** Last successful connection check. Null = never verified. */
  lastVerifiedAt: timestamp('last_verified_at'),
  /** If non-null, the server is failing — last error message for debugging. */
  lastErrorMessage: text('last_error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const agentMcpLinks = pgTable('agent_mcp_links', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull().references(() => agentDefinitions.id, { onDelete: 'cascade' }),
  mcpServerId: integer('mcp_server_id').notNull().references(() => mcpServers.id, { onDelete: 'cascade' }),
  /**
   * Optional whitelist of tool names from this server. If null, all
   * advertised tools are exposed to the agent. Stored as JSON string array.
   */
  enabledToolsJson: text('enabled_tools_json'),
}, (table) => [
  index('agent_mcp_links_agent_id_idx').on(table.agentId),
  uniqueIndex('agent_mcp_links_unique').on(table.agentId, table.mcpServerId),
]);

// ── Knowledge / RAG ───────────────────────────────────────────────────────
//
// Chunks are produced by a pipeline run from a dataset of source: 'obsidian_vault'
// (or any other source) → chunk_text → embed → promote_knowledge.
// Retrieval is vector search filtered by datasetId + optional frontmatter / path
// prefix. agentKnowledgeLinks attaches an agent to one-or-more datasets so its
// retrieval scope is narrowed at runtime.
//
// embedding is pgvector(1536) — we represent it as text in Drizzle (cast at the
// SQL layer) since drizzle-orm has no first-class pgvector type yet. All vector
// ops happen in raw SQL via `sql`-tagged templates in lib/knowledge-retrieval.ts.
export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  datasetId: integer('dataset_id').notNull().references(() => datasets.id, { onDelete: 'cascade' }),
  /** Logical source path inside the dataset (e.g. "Knowledge Base/Sources/foo.md"). */
  sourcePath: text('source_path').notNull(),
  /** Position of this chunk within the source file. */
  chunkIndex: integer('chunk_index').notNull().default(0),
  totalChunks: integer('total_chunks').notNull().default(1),
  /** Parsed frontmatter from the source file (mirrored on every chunk for cheap filter queries). */
  frontmatterJson: jsonb('frontmatter_json'),
  /** Heading path within the file, when discoverable (e.g. "Pricing > Enterprise"). */
  headingPath: text('heading_path'),
  /** The chunk text itself — what gets fed back to the LLM as context. */
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),
  tokenCount: integer('token_count').notNull().default(0),
  /** OpenAI text-embedding-3-small (1536 dims) serialized as pgvector. */
  embedding: text('embedding'),
  embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('knowledge_chunks_user_idx').on(table.userId),
  index('knowledge_chunks_dataset_idx').on(table.datasetId),
  index('knowledge_chunks_source_path_idx').on(table.sourcePath),
  uniqueIndex('knowledge_chunks_dataset_path_chunk_idx').on(table.datasetId, table.sourcePath, table.chunkIndex),
]);

/**
 * Attach one-or-more knowledge datasets to an agent. At runtime the agent's
 * retrieval step vector-searches `knowledge_chunks` filtered by these
 * datasetIds (optionally further filtered via `pathPrefix` or `filterJson`).
 */
export const agentKnowledgeLinks = pgTable('agent_knowledge_links', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull().references(() => agentDefinitions.id, { onDelete: 'cascade' }),
  datasetId: integer('dataset_id').notNull().references(() => datasets.id, { onDelete: 'cascade' }),
  /** Optional path prefix to restrict retrieval (e.g. "Bitwage GTM/Competitive"). */
  pathPrefix: text('path_prefix'),
  /** Optional frontmatter filter (e.g. {"type": "signal"}). Future use. */
  filterJson: jsonb('filter_json'),
  /** Override default top-K for this attachment (null = use agent default of 5). */
  topK: integer('top_k'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('agent_knowledge_links_agent_idx').on(table.agentId),
  uniqueIndex('agent_knowledge_links_unique').on(table.agentId, table.datasetId),
]);

// ── Meetings pipeline (0013) ──────────────────────────────────────────
// See docs/meetings-pipeline.md. The Fireflies absorption pipeline writes
// here. Mirrors netrunner's schema (CLAUDE.md in
// ~/Projects/bitwage-netrunner/packages/meetings-pipeline/) so porting is
// mechanical and parity-checkable.
//
// `embedding` on meeting_chunks is pgvector(1536) — same convention as
// knowledgeChunks: stored as text in Drizzle, all vector ops happen via
// raw `sql` templates in the executor.

export const meetings = pgTable('meetings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  firefliesId: text('fireflies_id').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  meetingDate: timestamp('meeting_date').notNull(),
  durationMin: integer('duration_min'),
  hostEmail: text('host_email'),
  attendeesJson: jsonb('attendees_json'),
  rawTranscriptPath: text('raw_transcript_path'),
  rawSummaryPath: text('raw_summary_path'),

  // Taxonomy (dedicated columns)
  meetingClass: text('meeting_class'),               // 'internal' | 'external'
  meetingCategory: text('meeting_category'),
  meetingSubcategory: text('meeting_subcategory'),
  workflow: text('workflow').notNull().default('unprocessed'),
  access: text('access'),
  maturity: text('maturity'),

  // Taxonomy (arrays — GIN-indexed in migration SQL)
  // Drizzle's text().array() maps to text[]
  brand: text('brand').array(),
  secondaryTags: text('secondary_tags').array(),

  // Taxonomy JSONB blob — query with @> only, never ->>
  taxonomyJson: jsonb('taxonomy_json'),

  // Enrichment progression flags
  enrichmentClassified: boolean('enrichment_classified').notNull().default(false),
  enrichmentEntitiesExtracted: boolean('enrichment_entities_extracted').notNull().default(false),
  enrichmentVaultWritten: boolean('enrichment_vault_written').notNull().default(false),
  enrichmentHumanReviewed: boolean('enrichment_human_reviewed').notNull().default(false),
  enrichmentVectorPrepped: boolean('enrichment_vector_prepped').notNull().default(false),

  vaultPath: text('vault_path'),
  legacyMeeting: boolean('legacy_meeting').notNull().default(false),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('meetings_fireflies_id_idx').on(table.firefliesId),
  index('meetings_user_idx').on(table.userId),
  index('meetings_meeting_class_idx').on(table.meetingClass),
  index('meetings_category_idx').on(table.meetingCategory),
  index('meetings_workflow_idx').on(table.workflow),
  index('meetings_access_idx').on(table.access),
  index('meetings_maturity_idx').on(table.maturity),
  index('meetings_meeting_date_idx').on(table.meetingDate),
]);

export const meetingChunks = pgTable('meeting_chunks', {
  id: serial('id').primaryKey(),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  sourceType: text('source_type').notNull(),         // 'transcript' | 'summary'
  sectionHeading: text('section_heading'),
  content: text('content').notNull(),
  /** pgvector(1536), serialized as text in Drizzle. */
  embedding: text('embedding'),
  embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),
  meetingClass: text('meeting_class'),
  meetingCategory: text('meeting_category'),
  taxonomyJson: jsonb('taxonomy_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('meeting_chunks_meeting_chunk_idx').on(table.meetingId, table.chunkIndex),
  index('meeting_chunks_meeting_class_idx').on(table.meetingClass),
  index('meeting_chunks_category_idx').on(table.meetingCategory),
]);

export const entities = pgTable('entities', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  type: text('type').notNull(),                      // 'person' | 'company' | 'product' | 'partner'
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('entities_user_name_type_idx').on(table.userId, table.name, table.type),
  index('entities_type_idx').on(table.type),
]);

export const entityMentions = pgTable('entity_mentions', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  mentionCount: integer('mention_count').notNull().default(1),
}, (table) => [
  uniqueIndex('entity_mentions_entity_meeting_idx').on(table.entityId, table.meetingId),
  index('entity_mentions_meeting_idx').on(table.meetingId),
]);

/**
 * Audit row for every LLM call made by a pipeline node executor (and any
 * future agent call that wants to record itself here). Used for cost
 * accounting, prompt-version diffing, and debugging classification drift.
 */
export const promptRuns = pgTable('prompt_runs', {
  id: serial('id').primaryKey(),
  pipelineRunId: integer('pipeline_run_id').references(() => pipelineRuns.id, { onDelete: 'set null' }),
  nodeId: integer('node_id').references(() => pipelineNodes.id, { onDelete: 'set null' }),
  meetingId: integer('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }),
  promptVersionTag: text('prompt_version_tag').notNull(),
  model: text('model').notNull(),
  inputJson: jsonb('input_json'),
  outputJson: jsonb('output_json'),
  errorMessage: text('error_message'),
  latencyMs: integer('latency_ms'),
  costUsd: real('cost_usd'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('prompt_runs_pipeline_run_idx').on(table.pipelineRunId),
  index('prompt_runs_node_idx').on(table.nodeId),
  index('prompt_runs_meeting_idx').on(table.meetingId),
  index('prompt_runs_created_at_idx').on(table.createdAt),
]);
