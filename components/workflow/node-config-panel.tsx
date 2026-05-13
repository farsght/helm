"use client";

import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface NodeConfig {
  subject?: string;
  body?: string;
  templateId?: number | null;
  message?: string;
  duration?: number;
  unit?: string;
  conditionType?: string;
  waitTime?: number;
  action?: string;
  tagName?: string;
  campaignId?: number;
  description?: string;
  prompt?: string;
}

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, updates: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<NodeConfig>(node.data.config || {});
  const [templates, setTemplates] = useState<Array<{ id: number; name: string }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTemplates(data);
    }).catch(() => {});
    fetch('/api/campaigns').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCampaigns(data);
    }).catch(() => {});
  }, []);

  const handleSave = () => {
    onUpdate(node.id, { config });
  };

  const renderConfigFields = () => {
    switch (node.data.type) {
      case "email":
        return (
          <>
            <div className="space-y-2">
              <Label className="text-white">Subject</Label>
              <Input
                value={config.subject || ""}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
                placeholder="Email subject..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Body</Label>
              <Textarea
                value={config.body || ""}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white min-h-[200px]"
                placeholder="Email body... Use {{first_name}}, {{company}}, etc."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Template</Label>
              <Select
                value={config.templateId?.toString() || "none"}
                onValueChange={(value) => setConfig({ ...config, templateId: value === "none" ? null : parseInt(value) })}
              >
                <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "linkedin_message":
      case "linkedin_connection":
        return (
          <div className="space-y-2">
            <Label className="text-white">Message</Label>
            <Textarea
              value={config.message || ""}
              onChange={(e) => setConfig({ ...config, message: e.target.value })}
              className="bg-[#1B1B1F] border-[#3A3A40] text-white min-h-[150px]"
              placeholder="Message... Use {{first_name}}, {{company}}, etc."
            />
          </div>
        );

      case "wait":
        return (
          <>
            <div className="space-y-2">
              <Label className="text-white">Duration</Label>
              <Input
                type="number"
                value={config.duration || 24}
                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Unit</Label>
              <Select
                value={config.unit || "hours"}
                onValueChange={(value) => setConfig({ ...config, unit: value })}
              >
                <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "condition":
        return (
          <>
            <div className="space-y-2">
              <Label className="text-white">Condition Type</Label>
              <Select
                value={config.conditionType || "email_opened"}
                onValueChange={(value) => setConfig({ ...config, conditionType: value })}
              >
                <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_opened">Email Opened</SelectItem>
                  <SelectItem value="email_clicked">Email Clicked</SelectItem>
                  <SelectItem value="email_replied">Email Replied</SelectItem>
                  <SelectItem value="linkedin_accepted">LinkedIn Connection Accepted</SelectItem>
                  <SelectItem value="linkedin_replied">LinkedIn Message Replied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Wait Time</Label>
              <Input
                type="number"
                value={config.waitTime || 24}
                onChange={(e) => setConfig({ ...config, waitTime: parseInt(e.target.value) })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
                placeholder="Hours to wait for condition"
              />
            </div>
          </>
        );

      case "tag":
        return (
          <>
            <div className="space-y-2">
              <Label className="text-white">Action</Label>
              <Select
                value={config.action || "add"}
                onValueChange={(value) => setConfig({ ...config, action: value })}
              >
                <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Tag</SelectItem>
                  <SelectItem value="remove">Remove Tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Tag Name</Label>
              <Input
                value={config.tagName || ""}
                onChange={(e) => setConfig({ ...config, tagName: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
                placeholder="Tag name"
              />
            </div>
          </>
        );

      case "move_to_campaign":
        return (
          <div className="space-y-2">
            <Label className="text-white">Target Campaign</Label>
            <Select
              value={config.campaignId?.toString() || ""}
              onValueChange={(value) => setConfig({ ...config, campaignId: parseInt(value) })}
            >
              <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "manual_task":
        return (
          <div className="space-y-2">
            <Label className="text-white">Task Description</Label>
            <Textarea
              value={config.description || ""}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="bg-[#1B1B1F] border-[#3A3A40] text-white min-h-[100px]"
              placeholder="Describe the manual task..."
            />
          </div>
        );

      case "ai_decision":
        return (
          <div className="space-y-2">
            <Label className="text-white">AI Prompt</Label>
            <Textarea
              value={config.prompt || ""}
              onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
              className="bg-[#1B1B1F] border-[#3A3A40] text-white min-h-[150px]"
              placeholder="Provide context for AI to make a decision..."
            />
          </div>
        );

      default:
        return <p className="text-gray-400 text-sm">No configuration needed</p>;
    }
  };

  return (
    <Card className="absolute right-4 top-4 w-96 z-10 bg-[#25252A] border-[#3A3A40] shadow-xl max-h-[calc(100vh-32px)] flex flex-col">
      <CardHeader className="border-b border-[#3A3A40]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">{String(node.data.label || 'Node')}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-white">Label</Label>
          <Input
            value={String(node.data.label || '')}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="bg-[#1B1B1F] border-[#3A3A40] text-white"
          />
        </div>
        {renderConfigFields()}
        <Button
          onClick={handleSave}
          className="w-full bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
        >
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
