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
import { DataTableLists, type ListRow } from "./components/data-table-lists";
import { ListFilterBuilder } from "./components/list-filter-builder";
import type { ListFilter } from "@/lib/list-filters";

const EMPTY_FILTER: ListFilter = { logic: "and", rules: [] };

export function ListsClient() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [listType, setListType] = useState<"static" | "dynamic">("static");
  const [filter, setFilter] = useState<ListFilter>(EMPTY_FILTER);

  useEffect(() => {
    fetch('/api/lists')
      .then(r => r.json())
      .then(data => setLists(Array.isArray(data) ? data : []))
      .catch(err => console.error('Fetch lists error:', err));
  }, []);

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setListType("static");
    setFilter(EMPTY_FILTER);
  };

  const handleCreateList = async () => {
    setLoading(true);
    try {
      const payload: {
        name: string;
        description: string;
        type: "static" | "dynamic";
        filterJson?: ListFilter;
      } = {
        name: formData.name,
        description: formData.description,
        type: listType,
      };
      if (listType === "dynamic") {
        payload.filterJson = filter;
      }
      const newList = await apiFetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setLists([{ ...newList, memberCount: 0 }, ...lists]);
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating list:', error);
      alert(`Failed to create list: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !!formData.name &&
    (listType === "static" || filter.rules.length > 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lists</h1>
          <p className="text-muted-foreground mt-1">Organize prospects into lists</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create List
        </Button>
      </div>

      <DataTableLists data={lists} onDataChange={setLists} />

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a static list (manually add prospects) or a dynamic list
              (membership defined by filter rules).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">List Name *</Label>
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
                placeholder="Optional description of this list"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>List Type</Label>
              <Tabs
                value={listType}
                onValueChange={(v) => setListType(v as "static" | "dynamic")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="static">Static</TabsTrigger>
                  <TabsTrigger value="dynamic">Dynamic</TabsTrigger>
                </TabsList>
                <TabsContent value="static" className="pt-3">
                  <p className="text-sm text-muted-foreground">
                    You'll add prospects manually after creating the list.
                  </p>
                </TabsContent>
                <TabsContent value="dynamic" className="pt-3 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Membership is computed from filter rules. Any prospect
                    matching the rules will appear in this list.
                  </p>
                  <ListFilterBuilder value={filter} onChange={setFilter} />
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
              onClick={handleCreateList}
              disabled={loading || !canSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Creating...' : 'Create List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
