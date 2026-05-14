'use client';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2, Trash2 } from "lucide-react";
import { PageHeader, EmptyState, ConfirmDialog } from "@/components/page";

type Company = {
  id: number;
  name: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  location: string | null;
  website: string | null;
  createdAt: string;
};

export function CompaniesClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '', industry: '', employeeCount: '', location: '', website: '' });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const refetch = () => {
    fetch('/api/companies').then(r => r.json()).then(d => setCompanies(Array.isArray(d) ? d : []));
  };
  useEffect(refetch, []);

  const handleCreate = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          employeeCount: form.employeeCount ? parseInt(form.employeeCount) : null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: '', domain: '', industry: '', employeeCount: '', location: '', website: '' });
        refetch();
      }
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/companies/${deleteId}`, { method: 'DELETE' });
    if (res.ok) refetch();
    setDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Companies"
        description="Organizations you do business with."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Company
          </Button>
        }
      />

      <div className="border rounded-md bg-card">
        {companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies yet"
            description="Add your first one to start tracking organizations."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />New Company
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Domain</th>
                <th className="px-4 py-2 font-medium">Industry</th>
                <th className="px-4 py-2 font-medium">Employees</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.domain || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.industry || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.employeeCount ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.location || '—'}</td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
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
          <DialogHeader><DialogTitle>New Company</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Domain</Label><Input placeholder="acme.com" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} /></div>
            <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} /></div>
            <div><Label>Employees</Label><Input type="number" value={form.employeeCount} onChange={e => setForm({ ...form, employeeCount: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Website</Label><Input placeholder="https://acme.com" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={loading || !form.name} onClick={handleCreate}>{loading ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this company?"
        description="This will also unlink any contacts and deals associated with it. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
