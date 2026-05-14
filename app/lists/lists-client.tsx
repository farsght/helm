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
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DataGridLists, type ListRow } from "./components/data-grid-lists";

export function ListsClient() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetch('/api/lists')
      .then(r => r.json())
      .then(data => setLists(Array.isArray(data) ? data : []))
      .catch(err => console.error('Fetch lists error:', err));
  }, []);

  const handleCreateList = async () => {
    setLoading(true);
    try {
      const newList = await apiFetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: 'static',
        }),
      });
      setLists([{ ...newList, memberCount: 0 }, ...lists]);
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating list:', error);
      alert(`Failed to create list: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Lists</h1>
          <p className="text-gray-400 mt-1">Organize prospects into lists</p>
        </div>
        <Button
          className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create List
        </Button>
      </div>

      <DataGridLists data={lists} onDataChange={setLists} />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-[#25252A] border-[#3A3A40] text-white">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new list to organize your prospects
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">List Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
                placeholder="e.g., Tech Founders Q1 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
                placeholder="Optional description of this list"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="border-[#3A3A40] text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateList}
              disabled={loading || !formData.name}
              className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
            >
              {loading ? 'Creating...' : 'Create List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
