'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Plus, Eye } from 'lucide-react';

interface TemplateEditorProps {
  template?: {
    id: number;
    name: string;
    channel: string;
    subject?: string | null;
    body: string;
    variablesJson?: string | null;
  };
  onSave: (data: {
    name: string;
    channel: string;
    subject?: string;
    body: string;
    variables: string[];
  }) => Promise<void>;
  onCancel: () => void;
}

const AVAILABLE_VARIABLES = [
  '{{first_name}}',
  '{{last_name}}',
  '{{company}}',
  '{{title}}',
  '{{email}}',
  '{{phone}}',
  '{{industry}}',
  '{{location}}',
];

const SAMPLE_PROSPECT = {
  firstName: 'Sarah',
  lastName: 'Johnson',
  company: 'TechCorp Inc.',
  title: 'VP of Sales',
  email: 'sarah.johnson@techcorp.com',
  phone: '(555) 123-4567',
  industry: 'SaaS',
  location: 'San Francisco, CA',
};

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [channel, setChannel] = useState<'email' | 'linkedin'>((template?.channel as 'email' | 'linkedin') || 'email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);

  const insertVariable = (variable: string) => {
    setBody(prev => prev + variable);
  };

  const generateWithAI = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/messages/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectData: SAMPLE_PROSPECT,
          channel,
          tone: 'professional',
          variantCount: 1,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate');

      const data = await response.json();
      if (data.variants && data.variants[0]) {
        if (channel === 'email' && data.variants[0].subject) {
          setSubject(data.variants[0].subject);
        }
        setBody(data.variants[0].body);
      }
    } catch (err) {
      console.error('AI generation error:', err);
      alert('Failed to generate template with AI');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name || !body) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Extract used variables
      const usedVariables = AVAILABLE_VARIABLES.filter(v => body.includes(v) || subject.includes(v));

      await onSave({
        name,
        channel,
        subject: channel === 'email' ? subject : undefined,
        body,
        variables: usedVariables,
      });
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = () => {
    let previewSubject = subject;
    let previewBody = body;

    // Replace variables with sample data
    AVAILABLE_VARIABLES.forEach(variable => {
      const key = variable.replace(/[{}]/g, '') as keyof typeof SAMPLE_PROSPECT;
      const value = SAMPLE_PROSPECT[key] || '';
      previewSubject = previewSubject.replace(new RegExp(variable.replace(/[{}]/g, '\\{\\}'), 'g'), value);
      previewBody = previewBody.replace(new RegExp(variable.replace(/[{}]/g, '\\{\\}'), 'g'), value);
    });

    return (
      <Card className="bg-[#25252A] border-[#3A3A40]">
        <CardHeader>
          <CardTitle className="text-white text-sm">Preview with Sample Data</CardTitle>
          <CardDescription className="text-xs">
            {SAMPLE_PROSPECT.firstName} {SAMPLE_PROSPECT.lastName} • {SAMPLE_PROSPECT.title} at {SAMPLE_PROSPECT.company}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {channel === 'email' && previewSubject && (
            <div>
              <Label className="text-gray-400 text-xs">Subject</Label>
              <p className="text-white mt-1 font-medium">{previewSubject}</p>
            </div>
          )}
          <div>
            <Label className="text-gray-400 text-xs">Message</Label>
            <div className="text-white mt-1 whitespace-pre-wrap bg-[#1B1B1F] p-4 rounded-md border border-[#3A3A40]">
              {previewBody}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Build reusable message templates with variables
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-white">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card className="bg-[#25252A] border-[#3A3A40]">
        <CardHeader>
          <CardTitle className="text-white">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400">Template Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Initial Outreach - VP Sales"
                className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400">Channel</Label>
              <Select value={channel} onValueChange={(v: 'email' | 'linkedin') => setChannel(v)}>
                <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
        <TabsList className="bg-[#25252A]">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4 mt-4">
          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Message Content</CardTitle>
                <Button
                  size="sm"
                  onClick={generateWithAI}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {generating ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {channel === 'email' && (
                <div>
                  <Label className="text-gray-400">Subject Line</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject line..."
                    className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-1"
                  />
                </div>
              )}
              
              <div>
                <Label className="text-gray-400">Message Body</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Write your ${channel} message here...`}
                  rows={12}
                  className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-gray-400 mb-2 block">Insert Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <Button
                      key={variable}
                      size="sm"
                      variant="outline"
                      onClick={() => insertVariable(variable)}
                      className="bg-[#1B1B1F] border-[#3A3A40] text-[#266DF0] hover:bg-[#266DF0] hover:text-white text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {variable}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          {renderPreview()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
