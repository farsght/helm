'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Users } from "lucide-react";

type List = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  memberCount: number;
};

type ListMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
};

export function ListsClient({ initialLists }: { initialLists: List[] }) {
  const [lists, setLists] = useState<List[]>(initialLists);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [listMembers, setListMembers] = useState<ListMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleCreateList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: 'static',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create list');
      
      const newList = await response.json();
      setLists([{ ...newList, memberCount: 0 }, ...lists]);
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    } finally {
      setLoading(false);
    }
  };

  const handleViewList = async (listId: number) => {
    setSelectedListId(listId);
    setViewDialogOpen(true);
    setLoadingMembers(true);
    
    try {
      const response = await fetch(`/api/lists/${listId}/members`);
      if (!response.ok) throw new Error('Failed to fetch list members');
      
      const members = await response.json();
      setListMembers(members);
    } catch (error) {
      console.error('Error fetching list members:', error);
      setListMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const selectedList = lists.find(l => l.id === selectedListId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Card key={list.id} className="bg-[#25252A] border-[#3A3A40] hover:border-[#266DF0] transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-white">{list.name}</CardTitle>
                  <CardDescription className="text-gray-400 mt-2">
                    {list.description || 'No description'}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    list.type === 'static'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-purple-500/10 text-purple-400'
                  }
                >
                  {list.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{list.memberCount} prospects</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#266DF0] hover:text-white hover:bg-[#266DF0]"
                  onClick={() => handleViewList(list.id)}
                >
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create List Dialog */}
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

      {/* View List Members Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-[#25252A] border-[#3A3A40] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedList?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedList?.description || 'No description'} • {selectedList?.memberCount || 0} prospects
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingMembers ? (
              <div className="text-center py-8 text-gray-400">Loading members...</div>
            ) : listMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No prospects in this list yet</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {listMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-gray-400">
                        {member.title && member.company
                          ? `${member.title} at ${member.company}`
                          : member.company || member.title || member.email || '—'}
                      </p>
                    </div>
                    {member.email && (
                      <span className="text-sm text-gray-400">{member.email}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              className="border-[#3A3A40] text-gray-400"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
