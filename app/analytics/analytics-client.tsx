'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Mail } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useEffect, useState } from "react";

type AnalyticsData = {
  summary: {
    totalSent: number;
    openRate: number;
    replyRate: number;
    meetingsBooked: number;
  };
  funnel: {
    step: string;
    count: number;
    percentage: number;
  }[];
  topTemplates: {
    name: string;
    sent: number;
    replyRate: number;
  }[];
  sendingTimeHeatmap: {
    day: string;
    hour: number;
    count: number;
  }[];
  replyRateByIndustry: {
    industry: string;
    replyRate: number;
    count: number;
  }[];
  replyRateByTitle: {
    title: string;
    replyRate: number;
    count: number;
  }[];
  trendsChart: {
    date: string;
    sent: number;
    opened: number;
    replied: number;
  }[];
};

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/cross-campaign')
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

  const COLORS = ['#266DF0', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Track your campaign performance and insights across all campaigns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.totalSent}</div>
            <p className="text-xs text-green-500 mt-1">All campaigns</p>
          </CardContent>
        </Card>

        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.openRate.toFixed(1)}%</div>
            <p className="text-xs text-green-500 mt-1">+3.2% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Reply Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.replyRate.toFixed(1)}%</div>
            <p className="text-xs text-green-500 mt-1">+5.1% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Meetings Booked</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.meetingsBooked}</div>
            <p className="text-xs text-green-500 mt-1">
              {data.summary.totalSent > 0 ? ((data.summary.meetingsBooked / data.summary.totalSent) * 100).toFixed(1) : '0.0'}% conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Funnel */}
      <Card className="bg-[#25252A] border-[#3A3A40] mb-8">
        <CardHeader>
          <CardTitle className="text-white">Overall Conversion Funnel</CardTitle>
          <CardDescription className="text-gray-400">
            Aggregate funnel across all campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.funnel.map((step) => (
              <div key={step.step} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{step.step}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">{step.count} prospects</span>
                    <span className="text-sm font-medium text-[#266DF0]">{step.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="relative h-10 rounded-lg overflow-hidden bg-[#1B1B1F]">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#266DF0] to-[#1a5ac9] transition-all"
                    style={{ width: `${step.percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">{step.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trends Chart */}
      <Card className="bg-[#25252A] border-[#3A3A40] mb-8">
        <CardHeader>
          <CardTitle className="text-white">Performance Trends (Last 30 Days)</CardTitle>
          <CardDescription className="text-gray-400">
            Track your outreach activity and engagement over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trendsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A40" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1B1B1F', border: '1px solid #3A3A40' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#266DF0" strokeWidth={2} name="Sent" />
              <Line type="monotone" dataKey="opened" stroke="#8B5CF6" strokeWidth={2} name="Opened" />
              <Line type="monotone" dataKey="replied" stroke="#10B981" strokeWidth={2} name="Replied" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2 mb-8">
        {/* Top Templates */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Best Performing Templates</CardTitle>
            <CardDescription className="text-gray-400">
              Sorted by reply rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topTemplates} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#3A3A40" />
                <XAxis type="number" stroke="#6B7280" />
                <YAxis dataKey="name" type="category" stroke="#6B7280" width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1B1B1F', border: '1px solid #3A3A40' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="replyRate" fill="#266DF0" name="Reply Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reply Rate by Industry */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Reply Rate by Industry</CardTitle>
            <CardDescription className="text-gray-400">
              Which industries respond best
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.replyRateByIndustry}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: { industry: string; replyRate: number; count: number }) => `${entry.industry}: ${entry.replyRate.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.replyRateByIndustry.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1B1B1F', border: '1px solid #3A3A40' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Reply Rate by Title */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Reply Rate by Job Title</CardTitle>
            <CardDescription className="text-gray-400">
              Top responding job titles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.replyRateByTitle.map((item, index) => (
                <div key={item.title} className="flex items-center justify-between p-3 rounded-lg bg-[#1B1B1F]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#266DF0]/10 text-[#266DF0] text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-white">{item.title}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#266DF0]">{item.replyRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-400">{item.count} sent</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Sending Times */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Best Sending Times</CardTitle>
            <CardDescription className="text-gray-400">
              When do prospects engage most
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => (
                <div key={day} className="text-center">
                  <p className="text-xs text-gray-400 mb-2">{day}</p>
                  <div className="space-y-1">
                    {[9, 12, 15, 18].map((hour) => {
                      const dataPoint = data.sendingTimeHeatmap.find(
                        d => d.day === day && d.hour === hour
                      );
                      const intensity = dataPoint ? Math.min(dataPoint.count / 20, 1) : 0;
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="h-8 rounded"
                          style={{
                            backgroundColor: `rgba(38, 109, 240, ${intensity})`,
                          }}
                          title={`${day} ${hour}:00 - ${dataPoint?.count || 0} messages`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
              <span>9 AM</span>
              <span>12 PM</span>
              <span>3 PM</span>
              <span>6 PM</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
