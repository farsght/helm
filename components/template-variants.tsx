'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Variant {
  id: number;
  name: string;
  subject: string | null;
  body: string;
  sendCount: number;
  openCount: number;
  replyCount: number;
  clickCount: number;
  isWinner: boolean;
}

interface TemplateVariantsProps {
  templateId: number;
  channel: string;
}

export function TemplateVariants({ templateId, channel }: TemplateVariantsProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
  });

  useEffect(() => {
    loadVariants();
  }, [templateId]);

  const loadVariants = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}/variants`);
      if (!response.ok) throw new Error('Failed to load variants');
      const data = await response.json();
      setVariants(data);
    } catch (err) {
      console.error('Load variants error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingVariant(null);
    setFormData({ name: '', subject: '', body: '' });
    setShowDialog(true);
  };

  const handleEdit = (variant: Variant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      subject: variant.subject || '',
      body: variant.body,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingVariant) {
        const response = await fetch(`/api/templates/${templateId}/variants/${editingVariant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Failed to update variant');
      } else {
        const response = await fetch(`/api/templates/${templateId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Failed to create variant');
      }
      setShowDialog(false);
      loadVariants();
    } catch (err) {
      console.error('Save variant error:', err);
      alert('Failed to save variant');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this variant?')) return;
    try {
      const response = await fetch(`/api/templates/${templateId}/variants/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete variant');
      loadVariants();
    } catch (err) {
      console.error('Delete variant error:', err);
      alert('Failed to delete variant');
    }
  };

  const handleSetWinner = async (id: number) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/variants/${id}/set-winner`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to set winner');
      loadVariants();
    } catch (err) {
      console.error('Set winner error:', err);
      alert('Failed to set winner');
    }
  };

  const calculateReplyRate = (variant: Variant) => {
    return variant.sendCount > 0 ? ((variant.replyCount / variant.sendCount) * 100).toFixed(1) : '0.0';
  };

  if (loading) {
    return <div className="text-gray-400">Loading variants...</div>;
  }

  return (
    <>
      <Card className="bg-[#25252A] border-[#3A3A40]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">A/B Testing Variants</CardTitle>
              <CardDescription className="text-gray-400">
                Create multiple versions to test and optimize performance
              </CardDescription>
            </div>
            <Button onClick={handleCreate} size="sm" className="bg-[#266DF0] hover:bg-[#1a5ac9]">
              <Plus className="mr-2 h-4 w-4" />
              Add Variant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No variants yet</p>
              <Button onClick={handleCreate} variant="outline" className="border-[#3A3A40]">
                Create your first variant
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant) => {
                const replyRate = parseFloat(calculateReplyRate(variant));
                return (
                  <div
                    key={variant.id}
                    className={`p-4 rounded-lg border ${
                      variant.isWinner
                        ? 'bg-green-500/5 border-green-500/30'
                        : 'bg-[#1B1B1F] border-[#3A3A40]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{variant.name}</h3>
                        {variant.isWinner && (
                          <Badge className="bg-green-500/10 text-green-500">
                            <Trophy className="mr-1 h-3 w-3" />
                            Winner
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleEdit(variant)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                        >
                          Edit
                        </Button>
                        {!variant.isWinner && variant.sendCount > 20 && replyRate > 0 && (
                          <Button
                            onClick={() => handleSetWinner(variant.id)}
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300"
                          >
                            <Trophy className="mr-1 h-4 w-4" />
                            Set as Winner
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDelete(variant.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-400">Sent</p>
                        <p className="text-white font-medium">{variant.sendCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Opened</p>
                        <p className="text-white font-medium">{variant.openCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Clicked</p>
                        <p className="text-white font-medium">{variant.clickCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Replied</p>
                        <p className="text-white font-medium">{variant.replyCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Reply Rate</p>
                        <div className="flex items-center gap-1">
                          <p className="text-[#266DF0] font-bold">{replyRate}%</p>
                          {replyRate > 10 && <TrendingUp className="h-3 w-3 text-green-500" />}
                        </div>
                      </div>
                    </div>

                    {variant.subject && (
                      <p className="text-sm text-gray-400 mb-2">
                        <span className="text-gray-500">Subject:</span> {variant.subject}
                      </p>
                    )}
                    <p className="text-sm text-gray-400 line-clamp-2">{variant.body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1B1B1F] border-[#3A3A40] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit Variant' : 'Create Variant'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="variant-name" className="text-gray-400">Variant Name</Label>
              <Input
                id="variant-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Variant A, Short Version, etc."
                className="bg-[#25252A] border-[#3A3A40] text-white mt-2"
              />
            </div>
            {channel === 'email' && (
              <div>
                <Label htmlFor="variant-subject" className="text-gray-400">Subject Line</Label>
                <Input
                  id="variant-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Enter subject line"
                  className="bg-[#25252A] border-[#3A3A40] text-white mt-2"
                />
              </div>
            )}
            <div>
              <Label htmlFor="variant-body" className="text-gray-400">Message Body</Label>
              <Textarea
                id="variant-body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Enter message body"
                rows={8}
                className="bg-[#25252A] border-[#3A3A40] text-white mt-2 resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Use variables like {'{'}firstName{'}'}, {'{'}company{'}'}, etc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDialog(false)} variant="outline" className="border-[#3A3A40]">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#266DF0] hover:bg-[#1a5ac9]">
              {editingVariant ? 'Update' : 'Create'} Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
