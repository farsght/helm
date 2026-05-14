'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, Plus, UserPlus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import {
  DataGridListMembers,
  type ListMemberRow,
} from "./components/data-grid-list-members";

type ListMeta = {
  id: number;
  name: string;
  description: string | null;
  type: string;
};

export default function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const listId = parseInt(id, 10);

  const [list, setList] = useState<ListMeta | null>(null);
  const [members, setMembers] = useState<ListMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [allProspects, setAllProspects] = useState<ListMemberRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [listsAll, mems] = await Promise.all([
          fetch("/api/lists").then((r) => r.json()),
          apiFetch(`/api/lists/${listId}/members`),
        ]);
        if (cancelled) return;
        const found = Array.isArray(listsAll)
          ? listsAll.find((l: ListMeta) => l.id === listId)
          : null;
        setList(found ?? null);
        setMembers(Array.isArray(mems) ? mems : []);
      } catch (err) {
        console.error("Load list error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [listId]);

  const openAddProspects = async () => {
    setAddOpen(true);
    setSelectedIds([]);
    setSearch("");
    try {
      const res = await fetch("/api/prospects?limit=200");
      const data = await res.json();
      setAllProspects(
        Array.isArray(data) ? data : (data.prospects ?? []),
      );
    } catch (err) {
      console.error("Fetch prospects error:", err);
    }
  };

  const handleAddProspects = async () => {
    if (selectedIds.length === 0) return;
    setAdding(true);
    try {
      await apiFetch(`/api/lists/${listId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds: selectedIds }),
      });
      const refreshed = await apiFetch(`/api/lists/${listId}/members`);
      setMembers(refreshed);
      setAddOpen(false);
      setSelectedIds([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to add prospects: ${msg}`);
    } finally {
      setAdding(false);
    }
  };

  const memberIds = new Set(members.map((m) => m.id));
  const availableProspects = allProspects.filter((p) => !memberIds.has(p.id));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/lists"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Lists
          </Link>
          <h1 className="text-3xl font-bold text-white">
            {list?.name ?? (loading ? "Loading…" : `List #${listId}`)}
          </h1>
          {list?.description && (
            <p className="text-gray-400 mt-1">{list.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
          onClick={openAddProspects}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Prospects
        </Button>
      </div>

      <DataGridListMembers
        listId={listId}
        data={members}
        onDataChange={setMembers}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#25252A] border-[#3A3A40] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Prospects to {list?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select prospects to add to this list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="Search prospects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#1B1B1F] border-[#3A3A40] text-white"
            />
            <div className="max-h-80 overflow-y-auto">
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
                  {availableProspects
                    .filter(
                      (p) =>
                        !search ||
                        `${p.firstName} ${p.lastName} ${p.company} ${p.email}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((p) => (
                      <TableRow key={p.id} className="border-[#3A3A40]">
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(p.id)}
                            onCheckedChange={(checked) => {
                              setSelectedIds((prev) =>
                                checked
                                  ? [...prev, p.id]
                                  : prev.filter((x) => x !== p.id),
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-white">
                          {p.firstName} {p.lastName}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {p.company || "—"}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {p.email || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-gray-400">
              {selectedIds.length} selected
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              className="border-[#3A3A40] text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProspects}
              disabled={adding || selectedIds.length === 0}
              className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
            >
              {adding
                ? "Adding..."
                : `Add ${selectedIds.length} Prospect${selectedIds.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
