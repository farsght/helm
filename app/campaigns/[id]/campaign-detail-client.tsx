'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Mail, Linkedin, Loader2, UserPlus, Settings, GitBranch } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampaignCanvas } from "@/components/campaign-canvas";
import { CampaignAnalytics } from "@/components/campaign-analytics";
import { apiFetch } from "@/lib/api";

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

interface AvailableProspect {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
}

interface AvailableList {
  id: number;
  name: string;
  memberCount: number;
}

function CampaignSettingsForm({ campaign, onUpdate }: { campaign: Campaign; onUpdate: (c: Campaign) => void }) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      onUpdate(updated);
      alert('Settings saved');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to save settings: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Campaign Settings</h2>
      <Card className="bg-card border-border p-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Campaign Name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Description</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-background border-border text-foreground"
            rows={3}
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Card>
    </div>
  );
}

export function CampaignDetailClient({ id }: { id: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [enrolledProspects, setEnrolledProspects] = useState<Array<{ prospect: Prospect; enrollment: Enrollment }>>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollTab, setEnrollTab] = useState<'segments' | 'prospects'>('segments');
  const [availableSegments, setAvailableSegments] = useState<AvailableList[]>([]);
  const [availableProspects, setAvailableProspects] = useState<AvailableProspect[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [selectedProspectIds, setSelectedProspectIds] = useState<number[]>([]);
  const [prospectSearch, setProspectSearch] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [campaignRes, workflowRes, prospectsRes, messagesRes] = await Promise.all([
        fetch(`/api/campaigns/${id}`),
        fetch(`/api/campaigns/${id}/workflow`),
        fetch(`/api/campaigns/${id}/prospects`),
        fetch(`/api/messages?campaignId=${id}`),
      ]);
      if (!campaignRes.ok) return;
      const [campaignData, workflowData, prospectsData, messagesData] = await Promise.all([
        campaignRes.json(),
        workflowRes.json(),
        prospectsRes.json(),
        messagesRes.json(),
      ]);
      setCampaign(campaignData);
      setNodes(workflowData.nodes || []);
      setEdges(workflowData.edges || []);
      setEnrolledProspects(Array.isArray(prospectsData) ? prospectsData : []);
      setMessages(Array.isArray(messagesData) ? messagesData : []);
    } catch (err) {
      console.error('Fetch campaign detail error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async () => {
    if (!campaign) return;
    setToggling(true);
    try {
      const endpoint = campaign.status === 'active' ? 'pause' : 'activate';
      const data = await apiFetch(`/api/campaigns/${campaign.id}/${endpoint}`, { method: 'POST' });
      setCampaign(data.campaign);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Toggle status error:', err);
      alert(`Failed to update campaign status: ${msg}`);
    } finally {
      setToggling(false);
    }
  };

  const handleExecute = async () => {
    if (!campaign) return;
    setExecuting(true);
    try {
      const data = await apiFetch(`/api/campaigns/${campaign.id}/execute`, { method: 'POST' });
      alert(`Processed ${data.processed} of ${data.total} prospects`);
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Execute error:', err);
      alert(`Failed to execute campaign: ${msg}`);
    } finally {
      setExecuting(false);
    }
  };

  const openEnrollModal = async () => {
    setEnrollModalOpen(true);
    const [segmentsRes, prospectsRes] = await Promise.all([
      fetch('/api/segments'),
      fetch('/api/prospects?limit=200'),
    ]);
    const segmentsData = await segmentsRes.json();
    const prospectsData = await prospectsRes.json();
    setAvailableSegments(Array.isArray(segmentsData) ? segmentsData.map((l: { id: number; name: string; memberCount?: number }) => ({ ...l, memberCount: l.memberCount ?? 0 })) : []);
    setAvailableProspects(Array.isArray(prospectsData) ? prospectsData : (prospectsData.prospects ?? []));
  };

  const handleEnroll = async () => {
    if (!campaign) return;
    setEnrolling(true);
    try {
      const body = enrollTab === 'segments'
        ? { segmentId: selectedSegmentId }
        : { prospectIds: selectedProspectIds };
      const data = await apiFetch(`/api/campaigns/${campaign.id}/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      alert(`Enrolled ${data.enrolled} prospects`);
      setEnrollModalOpen(false);
      setSelectedSegmentId(null);
      setSelectedProspectIds([]);
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Enroll error:', err);
      alert(`Failed to enroll prospects: ${msg}`);
    } finally {
      setEnrolling(false);
    }
  };

  const getNodeLabel = (nodeId: number | null) => {
    if (!nodeId) return 'Not started';
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.label : 'Unknown step';
  };

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
              <Badge
                variant={campaign.status === 'active' ? 'default' : 'secondary'}
                className={
                  campaign.status === 'active'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-muted text-muted-foreground'
                }
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'active' && (
            <Button
              onClick={handleExecute}
              disabled={executing}
              variant="outline"
              className="border-border text-primary hover:bg-primary/10"
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
          <Link href={`/campaigns/${id}/workflow`}>
            <Button
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-card"
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Workflow Canvas
            </Button>
          </Link>
          <Button
            onClick={handleToggleStatus}
            disabled={toggling}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground hover:bg-card"
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
          <TabsList className="px-6 bg-background border-b border-border rounded-none h-12">
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
                <h2 className="text-xl font-semibold text-foreground">Enrolled Prospects</h2>
                <Button onClick={openEnrollModal} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Enroll Prospects
                </Button>
              </div>
              {enrolledProspects.length === 0 ? (
                <Card className="bg-card border-border p-8">
                  <p className="text-muted-foreground text-center">No prospects enrolled yet</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {enrolledProspects.map(({ prospect, enrollment }) => (
                    <Card
                      key={prospect.id}
                      className="p-4 bg-card border-border hover:border-primary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">
                            {prospect.firstName} {prospect.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {prospect.title} {prospect.company && `at ${prospect.company}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Current step: <span className="text-primary">{getNodeLabel(enrollment.currentNodeId)}</span>
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            enrollment.status === 'active'
                              ? 'bg-primary/10 text-primary'
                              : enrollment.status === 'completed'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-muted text-muted-foreground'
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
              <h2 className="text-xl font-semibold text-foreground">Campaign Messages</h2>
              {messages.length === 0 ? (
                <Card className="bg-card border-border p-8">
                  <p className="text-muted-foreground text-center">No messages sent yet</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <Card
                      key={message.id}
                      className="p-4 bg-card border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {message.channel === 'email' ? (
                              <Mail className="h-4 w-4 text-primary" />
                            ) : (
                              <Linkedin className="h-4 w-4 text-purple-400" />
                            )}
                            <span className="text-foreground font-medium">
                              {message.direction === 'outbound' ? 'To' : 'From'}: Prospect #{message.prospectId}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-background text-muted-foreground"
                            >
                              {message.status}
                            </Badge>
                          </div>
                          {message.subject && (
                            <p className="text-sm text-muted-foreground mb-2 font-medium">
                              {message.subject}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
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

          <TabsContent value="analytics" className="flex-1 overflow-auto">
            <CampaignAnalytics campaignId={campaign.id} />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Settings</h2>
            <CampaignSettingsForm campaign={campaign} onUpdate={setCampaign} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Enroll Prospects Modal */}
      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enroll Prospects</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select prospects to enroll in this campaign
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={enrollTab === 'segments' ? 'default' : 'outline'}
              onClick={() => setEnrollTab('segments')}
              className={enrollTab === 'segments' ? 'bg-primary' : 'border-border text-muted-foreground'}
            >
              From List
            </Button>
            <Button
              size="sm"
              variant={enrollTab === 'prospects' ? 'default' : 'outline'}
              onClick={() => setEnrollTab('prospects')}
              className={enrollTab === 'prospects' ? 'bg-primary' : 'border-border text-muted-foreground'}
            >
              Individual Prospects
            </Button>
          </div>

          {enrollTab === 'segments' ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableSegments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No segments available</p>
              ) : (
                availableSegments.map(list => (
                  <div
                    key={list.id}
                    onClick={() => setSelectedSegmentId(list.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSegmentId === list.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium text-foreground">{list.name}</span>
                    <span className="text-sm text-muted-foreground">{list.memberCount} prospects</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Search prospects..."
                value={prospectSearch}
                onChange={e => setProspectSearch(e.target.value)}
                className="bg-background border-border text-foreground"
              />
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Company</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableProspects
                      .filter(p =>
                        !prospectSearch ||
                        `${p.firstName} ${p.lastName} ${p.company} ${p.email}`.toLowerCase().includes(prospectSearch.toLowerCase())
                      )
                      .map(p => (
                        <TableRow key={p.id} className="border-border">
                          <TableCell>
                            <Checkbox
                              checked={selectedProspectIds.includes(p.id)}
                              onCheckedChange={checked => {
                                setSelectedProspectIds(prev =>
                                  checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-foreground">{p.firstName} {p.lastName}</TableCell>
                          <TableCell className="text-muted-foreground">{p.company || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{p.email || '—'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">{selectedProspectIds.length} selected</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollModalOpen(false)} className="border-border text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={enrolling || (enrollTab === 'segments' ? !selectedSegmentId : selectedProspectIds.length === 0)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {enrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
