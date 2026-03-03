'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, MessageSquare, Calendar, Users, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useEffect, useState } from "react";

type DashboardData = {
  metrics: {
    totalProspects: number;
    activeCampaigns: number;
    messagesToday: number;
    messagesWeek: number;
    messagesMonth: number;
    replyRate: number;
    openRate: number;
    meetingRate: number;
  };
  chartData: {
    date: string;
    sent: number;
    replied: number;
  }[];
  campaignPerformance: {
    name: string;
    sent: number;
    opened: number;
    replied: number;
  }[];
  recentConversations: {
    id: number;
    prospectName: string;
    status: string;
    lastMessage: string;
    unread: boolean;
  }[];
  campaigns: {
    id: number;
    name: string;
    description: string | null;
    status: string;
    prospectCount: number;
  }[];
};

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="h-9 w-48 bg-[#25252A] rounded animate-pulse" />
          <div className="h-5 w-96 bg-[#25252A] rounded animate-pulse mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-[#25252A] border-[#3A3A40]">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-[#1B1B1F] rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-[#1B1B1F] rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    {
      name: "Total Prospects",
      value: data.metrics.totalProspects,
      icon: Users,
      change: "+12%",
    },
    {
      name: "Active Campaigns",
      value: data.metrics.activeCampaigns,
      icon: BarChart3,
      change: "+8%",
    },
    {
      name: "Reply Rate",
      value: `${data.metrics.replyRate}%`,
      icon: MessageSquare,
      change: "+15%",
    },
    {
      name: "Meetings Booked",
      value: `${data.metrics.meetingRate}%`,
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

      {/* Messages Sent vs Replies Chart */}
      <div className="grid gap-8 lg:grid-cols-2 mb-8">
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Messages & Replies (Last 30 Days)</CardTitle>
            <CardDescription className="text-gray-400">
              Track your outreach effectiveness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A3A40" />
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1B1B1F', border: '1px solid #3A3A40' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#266DF0" strokeWidth={2} name="Sent" />
                <Line type="monotone" dataKey="replied" stroke="#10B981" strokeWidth={2} name="Replied" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Campaign Performance</CardTitle>
            <CardDescription className="text-gray-400">
              Compare your active campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A3A40" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1B1B1F', border: '1px solid #3A3A40' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="sent" fill="#266DF0" name="Sent" />
                <Bar dataKey="opened" fill="#8B5CF6" name="Opened" />
                <Bar dataKey="replied" fill="#10B981" name="Replied" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
            {data.campaigns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm mb-4">No campaigns yet</p>
                <Link
                  href="/campaigns"
                  className="inline-flex items-center gap-2 text-[#266DF0] hover:text-[#1e5bc4] text-sm font-medium"
                >
                  Create your first campaign
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              data.campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#1B1B1F] hover:bg-[#2A2A30] transition-colors border border-[#3A3A40]"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{campaign.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {campaign.description || 'No description'} • {campaign.prospectCount} prospects
                    </p>
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

        {/* Recent Conversations */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Needs Attention</CardTitle>
            <CardDescription className="text-gray-400">
              Recent conversations with unread replies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentConversations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">All caught up! 🎉</p>
              </div>
            ) : (
              data.recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/conversations`}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#1B1B1F] hover:bg-[#2A2A30] transition-colors border border-[#3A3A40]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{conversation.prospectName}</h3>
                      {conversation.unread && (
                        <div className="w-2 h-2 rounded-full bg-[#266DF0]" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                      {conversation.lastMessage}
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
