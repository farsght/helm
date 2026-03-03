'use client';

import { useState } from "react";
import { Card } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Upload, Download } from "lucide-react";

type Prospect = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  campaignName?: string | null;
  campaignStatus?: string | null;
};

export function ProspectsClient({ initialProspects }: { initialProspects: Prospect[] }) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    title: '',
    linkedinUrl: '',
  });

  const handleAddProspect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to add prospect');
      
      const newProspect = await response.json();
      setProspects([newProspect, ...prospects]);
      setAddDialogOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        title: '',
        linkedinUrl: '',
      });
    } catch (error) {
      console.error('Error adding prospect:', error);
      alert('Failed to add prospect');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;
    
    setLoading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header and one data row');
        return;
      }
      
      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const prospects = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const prospect: Record<string, string> = {};
        
        headers.forEach((header, i) => {
          const cleanHeader = header.replace(/['"]/g, '');
          if (cleanHeader === 'first_name' || cleanHeader === 'firstname') {
            prospect.firstName = values[i]?.replace(/['"]/g, '') || '';
          } else if (cleanHeader === 'last_name' || cleanHeader === 'lastname') {
            prospect.lastName = values[i]?.replace(/['"]/g, '') || '';
          } else if (cleanHeader === 'email') {
            prospect.email = values[i]?.replace(/['"]/g, '') || '';
          } else if (cleanHeader === 'company') {
            prospect.company = values[i]?.replace(/['"]/g, '') || '';
          } else if (cleanHeader === 'title') {
            prospect.title = values[i]?.replace(/['"]/g, '') || '';
          } else if (cleanHeader === 'linkedin_url' || cleanHeader === 'linkedin') {
            prospect.linkedinUrl = values[i]?.replace(/['"]/g, '') || '';
          }
        });
        
        return prospect;
      });
      
      const response = await fetch('/api/prospects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects }),
      });
      
      if (!response.ok) throw new Error('Failed to import prospects');
      
      const result = await response.json();
      alert(`Successfully imported ${result.count} prospects`);
      setImportDialogOpen(false);
      setCsvFile(null);
      
      // Refresh prospects list
      window.location.reload();
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/prospects');
      const data = await response.json();
      
      // Convert to CSV
      const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Title', 'LinkedIn URL'];
      const csvRows = [headers.join(',')];
      
      data.forEach((p: Prospect) => {
        csvRows.push([
          p.firstName,
          p.lastName,
          p.email || '',
          p.company || '',
          p.title || '',
          p.linkedinUrl || '',
        ].map(v => `"${v}"`).join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prospects-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export prospects');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Prospects</h1>
          <p className="text-gray-400 mt-1">Manage your prospect database</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#3A3A40] text-gray-400 hover:text-white hover:bg-[#25252A]"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            className="border-[#3A3A40] text-gray-400 hover:text-white hover:bg-[#25252A]"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Prospect
          </Button>
        </div>
      </div>

      <Card className="bg-[#25252A] border-[#3A3A40]">
        <Table>
          <TableHeader>
            <TableRow className="border-[#3A3A40] hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Email</TableHead>
              <TableHead className="text-gray-400">Company</TableHead>
              <TableHead className="text-gray-400">Title</TableHead>
              <TableHead className="text-gray-400">Industry</TableHead>
              <TableHead className="text-gray-400">Campaign</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((prospect) => (
              <TableRow key={prospect.id} className="border-[#3A3A40] hover:bg-[#1B1B1F]">
                <TableCell className="text-white font-medium">
                  {prospect.firstName} {prospect.lastName}
                </TableCell>
                <TableCell className="text-gray-400">{prospect.email}</TableCell>
                <TableCell className="text-gray-400">{prospect.company}</TableCell>
                <TableCell className="text-gray-400">{prospect.title}</TableCell>
                <TableCell className="text-gray-400">{prospect.industry}</TableCell>
                <TableCell className="text-gray-400">
                  {prospect.campaignName || "—"}
                </TableCell>
                <TableCell>
                  {prospect.campaignStatus ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-400">
                      {prospect.campaignStatus}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-500/10 text-gray-400">
                      Not enrolled
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add Prospect Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-[#25252A] border-[#3A3A40] text-white">
          <DialogHeader>
            <DialogTitle>Add New Prospect</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the prospect&apos;s information below
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="bg-[#1B1B1F] border-[#3A3A40] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="bg-[#1B1B1F] border-[#3A3A40] text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                className="bg-[#1B1B1F] border-[#3A3A40] text-white"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-[#3A3A40] text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProspect}
              disabled={loading || !formData.firstName || !formData.lastName}
              className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
            >
              {loading ? 'Adding...' : 'Add Prospect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-[#25252A] border-[#3A3A40] text-white">
          <DialogHeader>
            <DialogTitle>Import Prospects from CSV</DialogTitle>
            <DialogDescription className="text-gray-400">
              Upload a CSV file with columns: first_name, last_name, email, company, title, linkedin_url
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="bg-[#1B1B1F] border-[#3A3A40] text-white"
            />
            {csvFile && (
              <p className="text-sm text-gray-400 mt-2">
                Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setCsvFile(null);
              }}
              className="border-[#3A3A40] text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportCSV}
              disabled={loading || !csvFile}
              className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
            >
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
