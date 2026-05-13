'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Mail, Linkedin, Edit, Trash2 } from "lucide-react";
import { TemplateEditor } from "@/components/template-editor";

interface Template {
  id: number;
  name: string;
  channel: string;
  subject?: string | null;
  body: string;
  variablesJson?: string | null;
}

export function TemplatesClient() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(data => {
      setTemplates(Array.isArray(data) ? data : []);
    }).catch(err => console.error('Fetch templates error:', err));
  }, []);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleSave = async (data: {
    name: string;
    channel: string;
    subject?: string;
    body: string;
    variables: string[];
  }) => {
    try {
      if (editingTemplate) {
        // Update existing
        const response = await fetch(`/api/templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update template');

        const updated = await response.json();
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        // Create new
        const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to create template');

        const created = await response.json();
        setTemplates(prev => [created, ...prev]);
      }

      setShowEditor(false);
      setEditingTemplate(null);
      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      setTemplates(prev => prev.filter(t => t.id !== id));
      router.refresh();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete template');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Templates</h1>
            <p className="text-gray-400 mt-1">Manage your message templates</p>
          </div>
          <Button 
            onClick={handleCreate}
            className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="bg-[#25252A] border-[#3A3A40] hover:border-[#266DF0] transition-colors">
              <Link href={`/templates/${template.id}`}>
                <CardHeader className="cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {template.channel === 'email' ? (
                          <Mail className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Linkedin className="h-4 w-4 text-purple-400" />
                        )}
                        <CardTitle className="text-white">{template.name}</CardTitle>
                      </div>
                      {template.subject && (
                        <CardDescription className="text-gray-400 text-sm">
                          Subject: {template.subject}
                        </CardDescription>
                      )}
                    </div>
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
                </CardHeader>
              </Link>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-400 line-clamp-3 bg-[#1B1B1F] p-3 rounded-md border border-[#3A3A40]">
                  {template.body}
                </div>
                {template.variablesJson && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {JSON.parse(template.variablesJson).map((variable: string) => (
                      <Badge
                        key={variable}
                        variant="secondary"
                        className="bg-[#266DF0]/10 text-[#266DF0] text-xs"
                      >
                        {variable}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(template)}
                    className="flex-1 text-gray-400 hover:text-white hover:bg-[#3A3A40]"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleting === template.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deleting === template.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <Card className="bg-[#25252A] border-[#3A3A40] p-12">
            <div className="text-center">
              <Mail className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
              <p className="text-gray-400 mb-6">Create your first template to get started</p>
              <Button 
                onClick={handleCreate}
                className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1B1B1F] border-[#3A3A40]">
          <TemplateEditor
            template={editingTemplate || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
