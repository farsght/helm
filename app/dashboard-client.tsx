'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, MessageSquare, Calendar, Users, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch dashboard data');
        return r.json();
      })
      .then(setData)
      .catch(err => {
        console.error('Dashboard fetch error:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="h-9 w-48 bg-card rounded animate-pulse" />
          <div className="h-5 w-96 bg-card rounded animate-pulse mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-background rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-background rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-foreground rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    {
      name: "Total Prospects",
      value: data?.metrics?.totalProspects ?? 0,
      icon: Users,
      change: "+12%",
    },
    {
      name: "Active Campaigns",
      value: data?.metrics?.activeCampaigns ?? 0,
      icon: BarChart3,
      change: "+8%",
    },
    {
      name: "Reply Rate",
      value: `${data?.metrics?.replyRate ?? 0}%`,
      icon: MessageSquare,
      change: "+15%",
    },
    {
      name: "Meetings Booked",
      value: `${data?.metrics?.meetingRate ?? 0}%`,
      icon: Calendar,
      change: "+23%",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <PageHeader title="Dashboard" description={`Welcome back! Here's what's happening with your campaigns.`} />
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map((metric) => (
          <Card key={metric.name} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.name}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <p className="text-xs text-green-500 mt-1">{metric.change} from last week</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Messages Sent vs Replies Chart */}
      <div className="grid gap-8 lg:grid-cols-2 mb-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Messages & Replies (Last 30 Days)</CardTitle>
            <CardDescription className="text-muted-foreground">
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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Campaign Performance</CardTitle>
            <CardDescription className="text-muted-foreground">
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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Active Campaigns</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your currently running campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.campaigns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm mb-4">No campaigns yet</p>
                <Link
                  href="/campaigns"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/90 text-sm font-medium"
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
                  className="flex items-center justify-between p-4 rounded-lg bg-background hover:bg-accent transition-colors border border-border"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{campaign.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {campaign.description || 'No description'} • {campaign.prospectCount} prospects
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={campaign.status === 'active' ? 'default' : 'secondary'}
                      className={
                        campaign.status === 'active'
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {campaign.status}
                    </Badge>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Needs Attention</CardTitle>
            <CardDescription className="text-muted-foreground">
              Recent conversations with unread replies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentConversations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">All caught up! 🎉</p>
              </div>
            ) : (
              data.recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/conversations`}
                  className="flex items-center justify-between p-4 rounded-lg bg-background hover:bg-accent transition-colors border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{conversation.prospectName}</h3>
                      {conversation.unread && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {conversation.lastMessage}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
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
