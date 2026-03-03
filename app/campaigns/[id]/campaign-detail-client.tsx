'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Mail, Linkedin, Loader2 } from "lucide-react";
import { CampaignCanvas } from "@/components/campaign-canvas";

interface Campaign {
  id: number;
  name: string;
  description?: string | null;
  status: string;
}

interface WorkflowNode {
  id: number;
  label: string;
  type: string;
  positionX: number;
  positionY: number;
  configJson: string | null;
}

interface WorkflowEdge {
  id: number;
  sourceNodeId: number;
  targetNodeId: number;
  label: string | null;
}

interface Prospect {
  id: number;
  firstName: string;
  lastName: string;
  title?: string | null;
  company?: string | null;
}

interface Enrollment {
  status: string;
  currentNodeId: number | null;
}

interface Message {
  id: number;
  channel: string;
  direction: string;
  subject: string | null;
  body: string | null;
  status: string;
  prospectId: number;
  sentAt: Date | null;
  createdAt: Date;
}

interface CampaignDetailClientProps {
  campaign: Campaign;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  enrolledProspects: Array<{ prospect: Prospect; enrollment: Enrollment }>;
  messages: Message[];
}

export function CampaignDetailClient({
  campaign: initialCampaign,
  nodes,
  edges,
  enrolledProspects,
  messages,
}: CampaignDetailClientProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [toggling, setToggling] = useState(false);
  const [executing, setExecuting] = useState(false);

  const handleToggleStatus = async () => {
    setToggling(true);
    try {
      const endpoint = campaign.status === 'active' ? 'pause' : 'activate';
      const response = await fetch(`/api/campaigns/${campaign.id}/${endpoint}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to toggle status');

      const data = await response.json();
      setCampaign(data.campaign);
      router.refresh();
    } catch (err) {
      console.error('Toggle status error:', err);
      alert('Failed to update campaign status');
    } finally {
      setToggling(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to execute campaign');

      const data = await response.json();
      alert(`Processed ${data.processed} of ${data.total} prospects`);
      router.refresh();
    } catch (err) {
      console.error('Execute error:', err);
      alert('Failed to execute campaign');
    } finally {
      setExecuting(false);
    }
  };

  const getNodeLabel = (nodeId: number | null) => {
    if (!nodeId) return 'Not started';
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.label : 'Unknown step';
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#3A3A40] bg-[#1B1B1F]">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
              <Badge
                variant={campaign.status === 'active' ? 'default' : 'secondary'}
                className={
                  campaign.status === 'active'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-gray-500/10 text-gray-400'
                }
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="text-gray-400 text-sm mt-1">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'active' && (
            <Button
              onClick={handleExecute}
              disabled={executing}
              variant="outline"
              className="border-[#3A3A40] text-[#266DF0] hover:bg-[#266DF0]/10"
            >
              {executing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Now
                </>
              )}
            </Button>
          )}
          <Button
            onClick={handleToggleStatus}
            disabled={toggling}
            variant="outline"
            className="border-[#3A3A40] text-gray-400 hover:text-white hover:bg-[#25252A]"
          >
            {toggling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : campaign.status === 'active' ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="canvas" className="h-full flex flex-col">
          <TabsList className="px-6 bg-[#1B1B1F] border-b border-[#3A3A40] rounded-none h-12">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="prospects">Prospects ({enrolledProspects.length})</TabsTrigger>
            <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="flex-1 m-0 p-0">
            <CampaignCanvas
              campaignId={campaign.id}
              initialNodes={nodes}
              initialEdges={edges}
            />
          </TabsContent>

          <TabsContent value="prospects" className="flex-1 overflow-auto p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Enrolled Prospects</h2>
                <Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
                  Add Prospects
                </Button>
              </div>
              {enrolledProspects.length === 0 ? (
                <Card className="bg-[#25252A] border-[#3A3A40] p-8">
                  <p className="text-gray-400 text-center">No prospects enrolled yet</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {enrolledProspects.map(({ prospect, enrollment }) => (
                    <Card
                      key={prospect.id}
                      className="p-4 bg-[#25252A] border-[#3A3A40] hover:border-[#266DF0] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-white">
                            {prospect.firstName} {prospect.lastName}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {prospect.title} {prospect.company && `at ${prospect.company}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Current step: <span className="text-[#266DF0]">{getNodeLabel(enrollment.currentNodeId)}</span>
                          </p>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={
                            enrollment.status === 'active'
                              ? 'bg-blue-500/10 text-blue-400'
                              : enrollment.status === 'completed'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }
                        >
                          {enrollment.status}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="flex-1 overflow-auto p-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Campaign Messages</h2>
              {messages.length === 0 ? (
                <Card className="bg-[#25252A] border-[#3A3A40] p-8">
                  <p className="text-gray-400 text-center">No messages sent yet</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <Card
                      key={message.id}
                      className="p-4 bg-[#25252A] border-[#3A3A40]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {message.channel === 'email' ? (
                              <Mail className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Linkedin className="h-4 w-4 text-purple-400" />
                            )}
                            <span className="text-white font-medium">
                              {message.direction === 'outbound' ? 'To' : 'From'}: Prospect #{message.prospectId}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-[#1B1B1F] text-gray-400"
                            >
                              {message.status}
                            </Badge>
                          </div>
                          {message.subject && (
                            <p className="text-sm text-gray-300 mb-2 font-medium">
                              {message.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {message.body}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {message.sentAt
                              ? new Date(message.sentAt).toLocaleString()
                              : new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Analytics</h2>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card className="bg-[#25252A] border-[#3A3A40] p-4">
                <p className="text-sm text-gray-400 mb-1">Total Sent</p>
                <p className="text-2xl font-bold text-white">
                  {messages.filter(m => m.status === 'sent').length}
                </p>
              </Card>
              <Card className="bg-[#25252A] border-[#3A3A40] p-4">
                <p className="text-sm text-gray-400 mb-1">Opened</p>
                <p className="text-2xl font-bold text-white">
                  {messages.filter(m => m.status === 'opened').length}
                </p>
              </Card>
              <Card className="bg-[#25252A] border-[#3A3A40] p-4">
                <p className="text-sm text-gray-400 mb-1">Replied</p>
                <p className="text-2xl font-bold text-white">
                  {messages.filter(m => m.status === 'replied').length}
                </p>
              </Card>
            </div>
            <Card className="bg-[#25252A] border-[#3A3A40] p-6">
              <p className="text-gray-400">Detailed analytics coming soon...</p>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
            <Card className="bg-[#25252A] border-[#3A3A40] p-6">
              <p className="text-gray-400">Campaign settings coming soon...</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
