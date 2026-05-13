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
import { Plus, Users, Trash2, UserPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [addProspectsDialogOpen, setAddProspectsDialogOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [listMembers, setListMembers] = useState<ListMember[]>([]);
  const [allProspects, setAllProspects] = useState<ListMember[]>([]);
  const [selectedProspectIds, setSelectedProspectIds] = useState<number[]>([]);
  const [prospectSearch, setProspectSearch] = useState('');
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

  const handleDeleteList = async (id: number) => {
    if (!confirm('Delete this list?')) return;
    try {
      const response = await fetch(`/api/lists/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setLists(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Delete list error:', err);
      alert('Failed to delete list');
    }
  };

  const openAddProspects = async (listId: number) => {
    setSelectedListId(listId);
    setAddProspectsDialogOpen(true);
    const res = await fetch('/api/prospects?limit=200');
    const data = await res.json();
    setAllProspects(Array.isArray(data) ? data : (data.prospects ?? []));
  };

  const handleAddProspects = async () => {
    if (!selectedListId || selectedProspectIds.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/lists/${selectedListId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds: selectedProspectIds }),
      });
      if (!response.ok) throw new Error('Failed to add prospects');
      const data = await response.json();
      setLists(prev => prev.map(l => l.id === selectedListId ? { ...l, memberCount: l.memberCount + data.added } : l));
      setAddProspectsDialogOpen(false);
      setSelectedProspectIds([]);
    } catch (err) {
      console.error('Add prospects error:', err);
      alert('Failed to add prospects');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (prospectId: number) => {
    if (!selectedListId) return;
    try {
      await fetch(`/api/lists/${selectedListId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId }),
      });
      setListMembers(prev => prev.filter(m => m.id !== prospectId));
      setLists(prev => prev.map(l => l.id === selectedListId ? { ...l, memberCount: Math.max(0, l.memberCount - 1) } : l));
    } catch (err) {
      console.error('Remove member error:', err);
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
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAddProspects(list.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#266DF0] hover:text-white hover:bg-[#266DF0]"
                    onClick={() => handleViewList(list.id)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteList(list.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
                    <div className="flex items-center gap-2">
                      {member.email && (
                        <span className="text-sm text-gray-400">{member.email}</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.id)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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

      {/* Add Prospects to List Dialog */}
      <Dialog open={addProspectsDialogOpen} onOpenChange={setAddProspectsDialogOpen}>
        <DialogContent className="bg-[#25252A] border-[#3A3A40] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Prospects to List</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select prospects to add to {lists.find(l => l.id === selectedListId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="Search prospects..."
              value={prospectSearch}
              onChange={e => setProspectSearch(e.target.value)}
              className="bg-[#1B1B1F] border-[#3A3A40] text-white"
            />
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#3A3A40]">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Company</TableHead>
                    <TableHead className="text-gray-400">Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allProspects
                    .filter(p =>
                      !prospectSearch ||
                      `${p.firstName} ${p.lastName} ${p.company} ${p.email}`.toLowerCase().includes(prospectSearch.toLowerCase())
                    )
                    .map(p => (
                      <TableRow key={p.id} className="border-[#3A3A40]">
                        <TableCell>
                          <Checkbox
                            checked={selectedProspectIds.includes(p.id)}
                            onCheckedChange={checked => {
                              setSelectedProspectIds(prev =>
                                checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-white">{p.firstName} {p.lastName}</TableCell>
                        <TableCell className="text-gray-400">{p.company || '—'}</TableCell>
                        <TableCell className="text-gray-400">{p.email || '—'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-gray-400">{selectedProspectIds.length} selected</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProspectsDialogOpen(false)} className="border-[#3A3A40] text-gray-400">
              Cancel
            </Button>
            <Button
              onClick={handleAddProspects}
              disabled={loading || selectedProspectIds.length === 0}
              className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
            >
              {loading ? 'Adding...' : `Add ${selectedProspectIds.length} Prospects`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
