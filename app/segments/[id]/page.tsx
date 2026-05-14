'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, Plus, UserPlus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  DataGridSegmentMembers,
  type SegmentMemberRow,
} from "./components/data-grid-segment-members";

type SegmentMeta = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  filterJson?: string | null;
};

export default function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const segmentId = parseInt(id, 10);

  const [segment, setSegment] = useState<SegmentMeta | null>(null);
  const [members, setMembers] = useState<SegmentMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [allProspects, setAllProspects] = useState<SegmentMemberRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [segmentsAll, mems] = await Promise.all([
          fetch("/api/segments").then((r) => r.json()),
          apiFetch(`/api/segments/${segmentId}/members`),
        ]);
        if (cancelled) return;
        const found = Array.isArray(segmentsAll)
          ? segmentsAll.find((l: SegmentMeta) => l.id === segmentId)
          : null;
        setSegment(found ?? null);
        setMembers(Array.isArray(mems) ? mems : []);
      } catch (err) {
        console.error("Load segment error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [segmentId]);

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
      await apiFetch(`/api/segments/${segmentId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds: selectedIds }),
      });
      const refreshed = await apiFetch(`/api/segments/${segmentId}/members`);
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

  const isDynamic = segment?.type === "dynamic";
  let parsedFilter: { rules: Array<{ field: string; operator: string; value?: string }> } | null = null;
  if (isDynamic && segment?.filterJson) {
    try {
      parsedFilter = JSON.parse(segment.filterJson);
    } catch {
      parsedFilter = null;
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/segments"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Segments
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">
              {segment?.name ?? (loading ? "Loading…" : `Segment #${segmentId}`)}
            </h1>
            {segment && (
              <Badge variant="secondary" className="capitalize">
                {segment.type}
              </Badge>
            )}
          </div>
          {segment?.description && (
            <p className="text-muted-foreground mt-1">{segment.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} member{members.length === 1 ? "" : "s"}
            {isDynamic && " (auto-computed from filter rules)"}
          </p>
          {isDynamic && parsedFilter && parsedFilter.rules.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-card/40 p-3 max-w-2xl">
              <Filter className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Filter rules</p>
                {parsedFilter.rules.map((r, i) => (
                  <p key={i}>
                    <span className="text-foreground/80">{r.field}</span>{" "}
                    <span className="italic">{r.operator.replace(/_/g, " ")}</span>
                    {r.value ? (
                      <>
                        {" "}
                        <span className="text-foreground/80">&quot;{r.value}&quot;</span>
                      </>
                    ) : null}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        {!isDynamic && (
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={openAddProspects}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Prospects
          </Button>
        )}
      </div>

      <DataGridSegmentMembers
        segmentId={segmentId}
        data={members}
        onDataChange={setMembers}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Prospects to {segment?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select prospects to add to this segment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="Search prospects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background border-border text-foreground"
            />
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Company</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
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
                      <TableRow key={p.id} className="border-border">
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
                        <TableCell className="text-foreground">
                          {p.firstName} {p.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.company || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.email || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              className="border-border text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProspects}
              disabled={adding || selectedIds.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
