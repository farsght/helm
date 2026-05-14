'use client';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Trash2 } from "lucide-react";

type Contact = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  title: string | null;
  companyId: number | null;
  lifecycleStage: string;
};

type Company = { id: number; name: string };

const LIFECYCLE_STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'mql', label: 'MQL' },
  { value: 'sql', label: 'SQL' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'customer', label: 'Customer' },
  { value: 'evangelist', label: 'Evangelist' },
  { value: 'other', label: 'Other' },
];

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', title: '', companyId: '', lifecycleStage: 'lead',
  });

  const refetch = () => {
    Promise.all([
      fetch('/api/contacts').then(r => r.json()),
      fetch('/api/companies').then(r => r.json()),
    ]).then(([c, co]) => {
      setContacts(Array.isArray(c) ? c : []);
      setCompanies(Array.isArray(co) ? co : []);
    });
  };
  useEffect(refetch, []);

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName) return;
    setLoading(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId: form.companyId ? parseInt(form.companyId) : null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ firstName: '', lastName: '', email: '', title: '', companyId: '', lifecycleStage: 'lead' });
        refetch();
      }
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this contact?')) return;
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (res.ok) refetch();
  };

  const companyName = (id: number | null) => companies.find(c => c.id === id)?.name || '—';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">People you have a relationship with.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Contact</Button>
      </div>

      <div className="border rounded-md bg-card">
        {contacts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No contacts yet. Add your first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Stage</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{c.firstName} {c.lastName}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.title || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{companyName(c.companyId)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.email || '—'}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs">
                      {LIFECYCLE_STAGES.find(s => s.value === c.lifecycleStage)?.label || c.lifecycleStage}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Contact</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name *</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><Label>Last name *</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Company</Label>
              <Select value={form.companyId} onValueChange={v => setForm({ ...form, companyId: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {companies.map(co => <SelectItem key={co.id} value={String(co.id)}>{co.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Lifecycle stage</Label>
              <Select value={form.lifecycleStage} onValueChange={v => setForm({ ...form, lifecycleStage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={loading || !form.firstName || !form.lastName} onClick={handleCreate}>{loading ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
