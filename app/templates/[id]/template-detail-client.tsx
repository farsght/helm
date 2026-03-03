'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, Mail, Linkedin, Save } from "lucide-react";
import { TemplateVariants } from "@/components/template-variants";

interface Template {
  id: number;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  variablesJson: string | null;
}

interface TemplateDetailClientProps {
  template: Template;
}

export function TemplateDetailClient({ template: initialTemplate }: TemplateDetailClientProps) {
  const router = useRouter();
  const [template, setTemplate] = useState(initialTemplate);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: template.name,
    subject: template.subject || '',
    body: template.body,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          channel: template.channel,
          subject: formData.subject,
          body: formData.body,
        }),
      });

      if (!response.ok) throw new Error('Failed to update template');

      const updated = await response.json();
      setTemplate(updated);
      setEditing(false);
      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/templates">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              {template.channel === 'email' ? (
                <Mail className="h-6 w-6 text-blue-400" />
              ) : (
                <Linkedin className="h-6 w-6 text-purple-400" />
              )}
              <h1 className="text-2xl font-bold text-white">{template.name}</h1>
              <Badge
                variant="secondary"
                className={
                  template.channel === 'email'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-purple-500/10 text-purple-400'
                }
              >
                {template.channel}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    name: template.name,
                    subject: template.subject || '',
                    body: template.body,
                  });
                }}
                variant="outline"
                className="border-[#3A3A40]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#266DF0] hover:bg-[#1a5ac9]"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setEditing(true)}
              className="bg-[#266DF0] hover:bg-[#1a5ac9]"
            >
              Edit Template
            </Button>
          )}
        </div>
      </div>

      {/* Template Content */}
      <div className="grid gap-6 mb-8">
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Base Template</CardTitle>
            <CardDescription className="text-gray-400">
              This is the default template. Create variants below for A/B testing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-400">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editing}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2"
              />
            </div>

            {template.channel === 'email' && (
              <div>
                <Label htmlFor="subject" className="text-gray-400">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  disabled={!editing}
                  placeholder="Enter subject line"
                  className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2"
                />
              </div>
            )}

            <div>
              <Label htmlFor="body" className="text-gray-400">Message Body</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                disabled={!editing}
                rows={12}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2 resize-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Available variables: {'{'}firstName{'}'}, {'{'}lastName{'}'}, {'{'}company{'}'}, {'{'}title{'}'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Variants Section */}
        <TemplateVariants templateId={template.id} channel={template.channel} />
      </div>
    </div>
  );
}
