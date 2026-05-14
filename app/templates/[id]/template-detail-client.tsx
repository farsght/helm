'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, Mail, Linkedin, Save, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TemplateVariants } from "@/components/template-variants";

interface Template {
  id: number;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  variablesJson: string | null;
}

export function TemplateDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', body: '' });

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then(r => r.json())
      .then(t => {
        setTemplate(t);
        setFormData({ name: t.name, subject: t.subject || '', body: t.body });
      })
      .catch(err => console.error('Fetch template error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          channel: template.channel,
          subject: formData.subject,
          body: formData.body,
        }),
      });
      setTemplate(updated);
      setFormData({ name: updated.name, subject: updated.subject || '', body: updated.body });
      setEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Save error:', err);
      alert(`Failed to save template: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8 text-center text-muted-foreground">Template not found.</div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/templates">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              {template.channel === 'email' ? (
                <Mail className="h-6 w-6 text-primary" />
              ) : (
                <Linkedin className="h-6 w-6 text-purple-400" />
              )}
              <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
              <Badge
                variant="secondary"
                className={
                  template.channel === 'email'
                    ? 'bg-primary/10 text-primary'
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
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setEditing(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Edit Template
            </Button>
          )}
        </div>
      </div>

      {/* Template Content */}
      <div className="grid gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Base Template</CardTitle>
            <CardDescription className="text-muted-foreground">
              This is the default template. Create variants below for A/B testing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-muted-foreground">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editing}
                className="bg-background border-border text-foreground mt-2"
              />
            </div>

            {template.channel === 'email' && (
              <div>
                <Label htmlFor="subject" className="text-muted-foreground">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  disabled={!editing}
                  placeholder="Enter subject line"
                  className="bg-background border-border text-foreground mt-2"
                />
              </div>
            )}

            <div>
              <Label htmlFor="body" className="text-muted-foreground">Message Body</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                disabled={!editing}
                rows={12}
                className="bg-background border-border text-foreground mt-2 resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
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
