import { db } from './index';
import * as schema from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create a list
  const [list] = await db.insert(schema.segments).values({
    name: 'Tech Startup Founders',
    description: 'Founders of early-stage tech startups',
    type: 'static',
  }).returning();

  console.log('✅ Created list:', list.name);

  // Create prospects
  const prospectData = [
    { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@techstartup.io', company: 'TechStartup Inc', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/sarahjohnson', industry: 'SaaS', location: 'San Francisco, CA' },
    { firstName: 'Michael', lastName: 'Chen', email: 'michael@innovate.co', company: 'Innovate Co', title: 'Founder & CTO', linkedinUrl: 'https://linkedin.com/in/michaelchen', industry: 'AI/ML', location: 'Austin, TX' },
    { firstName: 'Emily', lastName: 'Rodriguez', email: 'emily@growthlab.io', company: 'GrowthLab', title: 'Co-Founder', linkedinUrl: 'https://linkedin.com/in/emilyrodriguez', industry: 'Marketing Tech', location: 'New York, NY' },
    { firstName: 'David', lastName: 'Kim', email: 'david@cloudnext.com', company: 'CloudNext', title: 'CEO & Founder', linkedinUrl: 'https://linkedin.com/in/davidkim', industry: 'Cloud Infrastructure', location: 'Seattle, WA' },
    { firstName: 'Jessica', lastName: 'Patel', email: 'jessica@dataflow.ai', company: 'DataFlow AI', title: 'Founder', linkedinUrl: 'https://linkedin.com/in/jessicapatel', industry: 'Data Analytics', location: 'Boston, MA' },
    { firstName: 'Ryan', lastName: 'O\'Connor', email: 'ryan@securebase.io', company: 'SecureBase', title: 'Co-Founder & CEO', linkedinUrl: 'https://linkedin.com/in/ryanoconnor', industry: 'Cybersecurity', location: 'Denver, CO' },
    { firstName: 'Amanda', lastName: 'Lee', email: 'amanda@fintech-plus.com', company: 'FinTech Plus', title: 'Founder', linkedinUrl: 'https://linkedin.com/in/amandalee', industry: 'FinTech', location: 'Chicago, IL' },
    { firstName: 'James', lastName: 'Wilson', email: 'james@edtech-hub.co', company: 'EdTech Hub', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/jameswilson', industry: 'EdTech', location: 'Los Angeles, CA' },
    { firstName: 'Sophia', lastName: 'Martinez', email: 'sophia@healthlink.io', company: 'HealthLink', title: 'Founder & CEO', linkedinUrl: 'https://linkedin.com/in/sophiamartinez', industry: 'HealthTech', location: 'Miami, FL' },
    { firstName: 'Daniel', lastName: 'Brown', email: 'daniel@ecotech.green', company: 'EcoTech', title: 'Co-Founder', linkedinUrl: 'https://linkedin.com/in/danielbrown', industry: 'CleanTech', location: 'Portland, OR' },
  ];

  const prospects = await db.insert(schema.prospects).values(prospectData).returning();
  console.log(`✅ Created ${prospects.length} prospects`);

  // Add prospects to list
  await db.insert(schema.segmentMembers).values(
    prospects.map(p => ({ segmentId: list.id, prospectId: p.id }))
  );
  console.log('✅ Added prospects to list');

  // Create Campaign 1: Product Launch Outreach
  const [campaign1] = await db.insert(schema.campaigns).values({
    name: 'Q1 Product Launch Outreach',
    description: 'Reaching out to tech founders about our new AI-powered sales automation platform',
    status: 'active',
    segmentId: list.id,
    scheduleJson: JSON.stringify({
      timezone: 'America/New_York',
      sendingWindows: [{ start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] }],
      dailyLimit: 50,
    }),
    aiPersonaJson: JSON.stringify({
      tone: 'professional yet friendly',
      context: 'We help sales teams automate outreach with AI',
    }),
  }).returning();

  console.log('✅ Created campaign:', campaign1.name);

  // Create workflow nodes for campaign 1
  const nodes1 = await db.insert(schema.workflowNodes).values([
    {
      campaignId: campaign1.id,
      type: 'linkedin_profile_view',
      label: 'View LinkedIn Profile',
      positionX: 100,
      positionY: 100,
      configJson: JSON.stringify({}),
    },
    {
      campaignId: campaign1.id,
      type: 'wait',
      label: 'Wait 1 Day',
      positionX: 300,
      positionY: 100,
      configJson: JSON.stringify({ duration: 24, unit: 'hours' }),
    },
    {
      campaignId: campaign1.id,
      type: 'linkedin_connection',
      label: 'Send Connection Request',
      positionX: 500,
      positionY: 100,
      configJson: JSON.stringify({
        message: 'Hi {{first_name}}, I noticed your work in {{industry}}. Would love to connect!',
      }),
    },
    {
      campaignId: campaign1.id,
      type: 'wait',
      label: 'Wait 3 Days',
      positionX: 700,
      positionY: 100,
      configJson: JSON.stringify({ duration: 72, unit: 'hours' }),
    },
    {
      campaignId: campaign1.id,
      type: 'email',
      label: 'Send Intro Email',
      positionX: 900,
      positionY: 100,
      configJson: JSON.stringify({
        subject: 'Quick question about {{company}}',
        body: 'Hi {{first_name}},\n\nI saw your profile and was impressed by what you\'re building at {{company}}.\n\nWould love to share how we\'re helping similar companies automate their outreach.\n\nBest,\nTeam',
        templateId: null,
      }),
    },
    {
      campaignId: campaign1.id,
      type: 'end',
      label: 'End Campaign',
      positionX: 1100,
      positionY: 100,
      configJson: JSON.stringify({}),
    },
  ]).returning();

  console.log(`✅ Created ${nodes1.length} workflow nodes for campaign 1`);

  // Create edges between nodes
  await db.insert(schema.workflowEdges).values([
    { campaignId: campaign1.id, sourceNodeId: nodes1[0].id, targetNodeId: nodes1[1].id },
    { campaignId: campaign1.id, sourceNodeId: nodes1[1].id, targetNodeId: nodes1[2].id },
    { campaignId: campaign1.id, sourceNodeId: nodes1[2].id, targetNodeId: nodes1[3].id },
    { campaignId: campaign1.id, sourceNodeId: nodes1[3].id, targetNodeId: nodes1[4].id },
    { campaignId: campaign1.id, sourceNodeId: nodes1[4].id, targetNodeId: nodes1[5].id },
  ]);

  console.log('✅ Created workflow edges for campaign 1');

  // Enroll some prospects
  await db.insert(schema.campaignProspects).values(
    prospects.slice(0, 5).map(p => ({
      campaignId: campaign1.id,
      prospectId: p.id,
      currentNodeId: nodes1[0].id,
      status: 'active',
    }))
  );

  console.log('✅ Enrolled 5 prospects in campaign 1');

  // Create Campaign 2: Follow-up Campaign
  const [campaign2] = await db.insert(schema.campaigns).values({
    name: 'Cold Email Follow-up Sequence',
    description: 'Follow-up sequence for prospects who didn\'t respond to initial outreach',
    status: 'draft',
    segmentId: list.id,
  }).returning();

  console.log('✅ Created campaign:', campaign2.name);

  // Create a simple workflow for campaign 2
  const nodes2 = await db.insert(schema.workflowNodes).values([
    {
      campaignId: campaign2.id,
      type: 'email',
      label: 'Follow-up Email',
      positionX: 100,
      positionY: 100,
      configJson: JSON.stringify({
        subject: 'Following up on my previous email',
        body: 'Hi {{first_name}},\n\nJust wanted to follow up on my previous email.\n\nLet me know if you\'d like to chat!\n\nBest,\nTeam',
      }),
    },
    {
      campaignId: campaign2.id,
      type: 'wait',
      label: 'Wait 5 Days',
      positionX: 300,
      positionY: 100,
      configJson: JSON.stringify({ duration: 120, unit: 'hours' }),
    },
    {
      campaignId: campaign2.id,
      type: 'end',
      label: 'End Campaign',
      positionX: 500,
      positionY: 100,
      configJson: JSON.stringify({}),
    },
  ]).returning();

  console.log(`✅ Created ${nodes2.length} workflow nodes for campaign 2`);

  await db.insert(schema.workflowEdges).values([
    { campaignId: campaign2.id, sourceNodeId: nodes2[0].id, targetNodeId: nodes2[1].id },
    { campaignId: campaign2.id, sourceNodeId: nodes2[1].id, targetNodeId: nodes2[2].id },
  ]);

  console.log('✅ Created workflow edges for campaign 2');

  // Create some sample messages
  await db.insert(schema.messages).values([
    {
      campaignId: campaign1.id,
      prospectId: prospects[0].id,
      nodeId: nodes1[4].id,
      channel: 'email',
      direction: 'outbound',
      subject: `Quick question about ${prospects[0].company}`,
      body: `Hi ${prospects[0].firstName},\n\nI saw your profile and was impressed by what you're building at ${prospects[0].company}.\n\nWould love to share how we're helping similar companies automate their outreach.\n\nBest,\nTeam`,
      status: 'sent',
      aiGenerated: false,
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      campaignId: campaign1.id,
      prospectId: prospects[1].id,
      nodeId: nodes1[4].id,
      channel: 'email',
      direction: 'outbound',
      subject: `Quick question about ${prospects[1].company}`,
      body: `Hi ${prospects[1].firstName},\n\nI saw your profile and was impressed by what you're building at ${prospects[1].company}.\n\nWould love to share how we're helping similar companies automate their outreach.\n\nBest,\nTeam`,
      status: 'opened',
      aiGenerated: false,
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      openedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ]);

  console.log('✅ Created sample messages');

  // Create conversations
  await db.insert(schema.conversations).values([
    {
      prospectId: prospects[0].id,
      campaignId: campaign1.id,
      status: 'new',
      lastMessageAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      prospectId: prospects[1].id,
      campaignId: campaign1.id,
      status: 'in_progress',
      lastMessageAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log('✅ Created conversations');

  // Create some templates
  await db.insert(schema.templates).values([
    {
      name: 'Initial Outreach - Email',
      channel: 'email',
      subject: 'Quick question about {{company}}',
      body: 'Hi {{first_name}},\n\nI came across {{company}} and was impressed by {{specific_detail}}.\n\nWe help companies like yours {{value_proposition}}.\n\nWould you be open to a quick 15-minute call?\n\nBest,\n{{sender_name}}',
      variablesJson: JSON.stringify(['first_name', 'company', 'specific_detail', 'value_proposition', 'sender_name']),
    },
    {
      name: 'LinkedIn Connection Request',
      channel: 'linkedin',
      subject: null,
      body: 'Hi {{first_name}}, I\'m impressed by your work in {{industry}}. I\'d love to connect and share ideas about {{topic}}!',
      variablesJson: JSON.stringify(['first_name', 'industry', 'topic']),
    },
  ]);

  console.log('✅ Created templates');

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log(`   - 1 list with ${prospects.length} prospects`);
  console.log(`   - 2 campaigns with workflows`);
  console.log(`   - Sample messages and conversations`);
  console.log(`   - 2 email templates`);
}

seed()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
