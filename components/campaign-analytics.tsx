'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

interface CampaignAnalyticsProps {
  campaignId: number;
}

type AnalyticsData = {
  funnel: {
    step: string;
    count: number;
    percentage: number;
  }[];
  activityChart: {
    date: string;
    sent: number;
    opened: number;
    replied: number;
  }[];
  stepMetrics: {
    nodeLabel: string;
    prospects: number;
    avgTimeHours: number;
  }[];
  variantPerformance: {
    variant: string;
    sent: number;
    opened: number;
    replied: number;
    replyRate: number;
  }[];
  summary: {
    totalEnrolled: number;
    contacted: number;
    opened: number;
    replied: number;
    interested: number;
    meetingBooked: number;
  };
};

export function CampaignAnalytics({ campaignId }: CampaignAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 bg-[#25252A] rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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

  if (!data) return <div className="text-gray-400 p-6">No analytics data available</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Campaign Analytics</h2>
        <p className="text-sm text-gray-400">Performance metrics and conversion funnel</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.totalEnrolled}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Reply Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.summary.contacted > 0
                ? ((data.summary.replied / data.summary.contacted) * 100).toFixed(1)
                : '0.0'}%
            </div>
            <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+5.2% vs last week</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Meetings Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.meetingBooked}</div>
            <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>
                {data.summary.contacted > 0
                  ? ((data.summary.meetingBooked / data.summary.contacted) * 100).toFixed(1)
                  : '0.0'}% conversion
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card className="bg-[#25252A] border-[#3A3A40]">
        <CardHeader>
          <CardTitle className="text-white">Conversion Funnel</CardTitle>
          <CardDescription className="text-gray-400">
            Track prospects through each stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.funnel.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{step.step}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">{step.count} prospects</span>
                    <span className="text-sm font-medium text-[#266DF0]">{step.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="relative h-12 rounded-lg overflow-hidden bg-[#1B1B1F]">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#266DF0] to-[#1a5ac9] transition-all"
                    style={{ width: `${step.percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">{step.count}</span>
                  </div>
                </div>
                {index < data.funnel.length - 1 && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-gray-500 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Chart */}
      <Card className="bg-[#25252A] border-[#3A3A40]">
        <CardHeader>
          <CardTitle className="text-white">Campaign Activity Over Time</CardTitle>
          <CardDescription className="text-gray-400">
            Daily message activity and engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.activityChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A40" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1B1B1F', border: '1px solid #3A3A40' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Area type="monotone" dataKey="sent" stackId="1" stroke="#266DF0" fill="#266DF0" fillOpacity={0.6} name="Sent" />
              <Area type="monotone" dataKey="opened" stackId="2" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} name="Opened" />
              <Area type="monotone" dataKey="replied" stackId="3" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Replied" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step Metrics */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Step-by-Step Breakdown</CardTitle>
            <CardDescription className="text-gray-400">
              Prospect distribution across workflow steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.stepMetrics.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No step data yet</p>
              ) : (
                data.stepMetrics.map((step) => (
                  <div key={step.nodeLabel} className="flex items-center justify-between p-3 rounded-lg bg-[#1B1B1F]">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{step.nodeLabel}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Avg. time: {step.avgTimeHours > 24 
                          ? `${(step.avgTimeHours / 24).toFixed(1)} days` 
                          : `${step.avgTimeHours.toFixed(1)} hours`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#266DF0]">{step.prospects}</p>
                      <p className="text-xs text-gray-400">prospects</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variant Performance */}
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Message Variants Performance</CardTitle>
            <CardDescription className="text-gray-400">
              A/B test results comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.variantPerformance.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No variant data yet</p>
            ) : (
              <div className="space-y-3">
                {data.variantPerformance.map((variant) => (
                  <div key={variant.variant} className="p-4 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-white">{variant.variant}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#266DF0]">{variant.replyRate.toFixed(1)}%</span>
                        {variant.replyRate > 10 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400">Sent</p>
                        <p className="text-white font-medium">{variant.sent}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Opened</p>
                        <p className="text-white font-medium">{variant.opened}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Replied</p>
                        <p className="text-white font-medium">{variant.replied}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
