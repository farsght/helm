'use client';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, Trash2 } from "lucide-react";

type Deal = {
  id: number;
  name: string;
  stage: string;
  amountCents: number | null;
  currency: string;
  companyId: number | null;
  primaryContactId: number | null;
  expectedCloseDate: string | null;
};

type Company = { id: number; name: string };
type Contact = { id: number; firstName: string; lastName: string; companyId: number | null };

const STAGES = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const STAGE_COLORS: Record<string, string> = {
  discovery: 'bg-muted text-muted-foreground',
  qualified: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  proposal: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  negotiation: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  closed_won: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  closed_lost: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export function DealsClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', companyId: '', primaryContactId: '', stage: 'discovery', amount: '', currency: 'USD', expectedCloseDate: '',
  });

  const refetch = () => {
    Promise.all([
      fetch('/api/deals').then(r => r.json()),
      fetch('/api/companies').then(r => r.json()),
      fetch('/api/contacts').then(r => r.json()),
    ]).then(([d, co, ct]) => {
      setDeals(Array.isArray(d) ? d : []);
      setCompanies(Array.isArray(co) ? co : []);
      setContacts(Array.isArray(ct) ? ct : []);
    });
  };
  useEffect(refetch, []);

  const handleCreate = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          companyId: form.companyId ? parseInt(form.companyId) : null,
          primaryContactId: form.primaryContactId ? parseInt(form.primaryContactId) : null,
          stage: form.stage,
          amountCents: form.amount ? Math.round(parseFloat(form.amount) * 100) : null,
          currency: form.currency,
          expectedCloseDate: form.expectedCloseDate || null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: '', companyId: '', primaryContactId: '', stage: 'discovery', amount: '', currency: 'USD', expectedCloseDate: '' });
        refetch();
      }
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this deal?')) return;
    const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' });
    if (res.ok) refetch();
  };

  const companyName = (id: number | null) => companies.find(c => c.id === id)?.name || '—';
  const formatAmount = (cents: number | null, currency: string) =>
    cents ? new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100) : '—';

  // Filter contacts by selected company in form
  const eligibleContacts = form.companyId
    ? contacts.filter(c => c.companyId === parseInt(form.companyId))
    : contacts;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-sm text-muted-foreground">Active opportunities and pipeline.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Deal</Button>
      </div>

      <div className="border rounded-md bg-card">
        {deals.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No deals yet. Create your first opportunity.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Stage</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Close Date</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {deals.map(d => (
                <tr key={d.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{d.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{companyName(d.companyId)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${STAGE_COLORS[d.stage] || 'bg-muted text-muted-foreground'}`}>
                      {STAGES.find(s => s.value === d.stage)?.label || d.stage}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{formatAmount(d.amountCents, d.currency)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
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
          <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Company</Label>
              <Select value={form.companyId} onValueChange={v => setForm({ ...form, companyId: v, primaryContactId: '' })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {companies.map(co => <SelectItem key={co.id} value={String(co.id)}>{co.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Primary Contact</Label>
              <Select value={form.primaryContactId} onValueChange={v => setForm({ ...form, primaryContactId: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {eligibleContacts.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="col-span-2"><Label>Expected Close Date</Label><Input type="date" value={form.expectedCloseDate} onChange={e => setForm({ ...form, expectedCloseDate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={loading || !form.name} onClick={handleCreate}>{loading ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
