import { db } from "@/db";
import { campaigns, messages, conversations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Mail, MessageSquare, Calendar, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  // Fetch campaigns
  const allCampaigns = await db.select().from(campaigns).limit(10);

  // Fetch metrics
  const totalMessages = await db.select({ count: sql<number>`count(*)` }).from(messages);
  const sentMessages = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.status, 'sent'));
  const openedMessages = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.status, 'opened'));
  const repliedMessages = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.status, 'replied'));

  // Fetch recent conversations
  const recentConversations = await db
    .select({
      id: conversations.id,
      status: conversations.status,
      lastMessageAt: conversations.lastMessageAt,
      prospectId: conversations.prospectId,
    })
    .from(conversations)
    .orderBy(sql`${conversations.lastMessageAt} DESC`)
    .limit(5);

  const metrics = [
    {
      name: "Total Messages",
      value: totalMessages[0]?.count || 0,
      icon: Mail,
      change: "+12%",
    },
    {
      name: "Sent",
      value: sentMessages[0]?.count || 0,
      icon: MessageSquare,
      change: "+8%",
    },
    {
      name: "Opened",
      value: openedMessages[0]?.count || 0,
      icon: TrendingUp,
      change: "+15%",
    },
    {
      name: "Replied",
      value: repliedMessages[0]?.count || 0,
      icon: Calendar,
      change: "+23%",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back! Here&apos;s what&apos;s happening with your campaigns.</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map((metric) => (
          <Card key={metric.name} className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                {metric.name}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metric.value}</div>
              <p className="text-xs text-green-500 mt-1">{metric.change} from last week</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Active Campaigns */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Active Campaigns</CardTitle>
            <CardDescription className="text-gray-400">
              Your currently running campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allCampaigns.length === 0 ? (
              <p className="text-gray-400 text-sm">No campaigns yet</p>
            ) : (
              allCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#1B1B1F] hover:bg-[#2A2A30] transition-colors border border-[#3A3A40]"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{campaign.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{campaign.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={campaign.status === 'active' ? 'default' : 'secondary'}
                      className={
                        campaign.status === 'active'
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-gray-500/10 text-gray-400'
                      }
                    >
                      {campaign.status}
                    </Badge>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Recent Conversations</CardTitle>
            <CardDescription className="text-gray-400">
              Latest prospect interactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentConversations.length === 0 ? (
              <p className="text-gray-400 text-sm">No conversations yet</p>
            ) : (
              recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/conversations`}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#1B1B1F] hover:bg-[#2A2A30] transition-colors border border-[#3A3A40]"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white">Prospect #{conversation.prospectId}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {conversation.lastMessageAt
                        ? new Date(conversation.lastMessageAt).toLocaleDateString()
                        : 'No messages yet'}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-blue-500/10 text-blue-400"
                  >
                    {conversation.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
