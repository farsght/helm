'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DataTableSegments, type SegmentRow } from "./components/data-table-segments";
import { SegmentFilterBuilder } from "./components/segment-filter-builder";
import type { SegmentFilter } from "@/lib/segment-filters";
import { PageHeader } from "@/components/page";

const EMPTY_FILTER: SegmentFilter = { logic: "and", rules: [] };

export function SegmentsClient() {
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [segmentType, setSegmentType] = useState<"static" | "dynamic">("static");
  const [filter, setFilter] = useState<SegmentFilter>(EMPTY_FILTER);

  useEffect(() => {
    fetch('/api/segments')
      .then(r => r.json())
      .then(data => setSegments(Array.isArray(data) ? data : []))
      .catch(err => console.error('Fetch segments error:', err));
  }, []);

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setSegmentType("static");
    setFilter(EMPTY_FILTER);
  };

  const handleCreateSegment = async () => {
    setLoading(true);
    try {
      const payload: {
        name: string;
        description: string;
        type: "static" | "dynamic";
        filterJson?: SegmentFilter;
      } = {
        name: formData.name,
        description: formData.description,
        type: segmentType,
      };
      if (segmentType === "dynamic") {
        payload.filterJson = filter;
      }
      const newSegment = await apiFetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSegments([{ ...newSegment, memberCount: 0 }, ...segments]);
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating segment:', error);
      alert(`Failed to create segment: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !!formData.name &&
    (segmentType === "static" || filter.rules.length > 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <PageHeader
          title="Segments"
          description="Organize prospects into segments"
          actions={
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Segment
            </Button>
          }
        />
      </div>

      <DataTableSegments data={segments} onDataChange={setSegments} />

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Segment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a static segment (manually add prospects) or a dynamic segment
              (membership defined by filter rules).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Segment Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Tech Founders Q1 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of this segment"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Segment Type</Label>
              <Tabs
                value={segmentType}
                onValueChange={(v) => setSegmentType(v as "static" | "dynamic")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="static">Static</TabsTrigger>
                  <TabsTrigger value="dynamic">Dynamic</TabsTrigger>
                </TabsList>
                <TabsContent value="static" className="pt-3">
                  <p className="text-sm text-muted-foreground">
                    You'll add prospects manually after creating the segment.
                  </p>
                </TabsContent>
                <TabsContent value="dynamic" className="pt-3 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Membership is computed from filter rules. Any prospect
                    matching the rules will appear in this segment.
                  </p>
                  <SegmentFilterBuilder value={filter} onChange={setFilter} />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSegment}
              disabled={loading || !canSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Creating...' : 'Create Segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
