'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Play, Pause, Target, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/page";

type Campaign = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  prospectCount: number;
  stepCount: number;
};

export function CampaignsClient() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/campaigns').then(r => r.json()).then(data => {
      setCampaigns(Array.isArray(data) ? data : []);
    }).catch(err => console.error('Fetch campaigns error:', err));
  }, []);

  const handleNewCampaign = async () => {
    setCreating(true);
    try {
      const newCampaign = await apiFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Campaign', status: 'draft' }),
      });
      router.push(`/campaigns/${newCampaign.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Create campaign error:', err);
      alert(`Failed to create campaign: ${msg}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    setTogglingId(campaign.id);
    try {
      const endpoint = campaign.status === 'active' ? 'pause' : 'activate';
      const data = await apiFetch(`/api/campaigns/${campaign.id}/${endpoint}`, {
        method: 'POST',
      });
      setCampaigns(prev =>
        prev.map(c => c.id === campaign.id ? { ...c, status: data.campaign.status } : c)
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Toggle status error:', err);
      alert(`Failed to update campaign status: ${msg}`);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <PageHeader
          title="Campaigns"
          description="Manage your outreach campaigns"
          actions={
            <Button
              onClick={handleNewCampaign}
              disabled={creating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              New Campaign
            </Button>
          }
        />
      </div>

      {campaigns.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
              Create your first campaign to start automating your outreach
            </p>
            <Button
              onClick={handleNewCampaign}
              disabled={creating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="bg-card border-border hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-foreground">{campaign.name}</CardTitle>
                    <CardDescription className="text-muted-foreground mt-2">
                      {campaign.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={campaign.status === 'active' ? 'default' : 'secondary'}
                    className={
                      campaign.status === 'active'
                        ? 'bg-green-500/10 text-green-500'
                        : campaign.status === 'draft'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-yellow-500/10 text-yellow-500'
                    }
                  >
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Prospects</span>
                  <span className="text-foreground font-medium">{campaign.prospectCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Steps</span>
                  <span className="text-foreground font-medium">{campaign.stepCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reply Rate</span>
                  <span className="text-foreground font-medium">0%</span>
                </div>
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={togglingId === campaign.id}
                    onClick={() => handleToggleStatus(campaign)}
                    className="flex-1 text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    {togglingId === campaign.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : campaign.status === 'active' ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start
                      </>
                    )}
                  </Button>
                  <Link href={`/campaigns/${campaign.id}`} className="flex-1">
                    <Button
                      size="sm"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
