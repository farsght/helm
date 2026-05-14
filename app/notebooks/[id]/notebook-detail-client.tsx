"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Play, Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";

interface Notebook {
  id: number;
  name: string;
  description: string | null;
  language: string;
}

interface Cell {
  id: number;
  cellIndex: number;
  language: string;
  code: string;
  outputJson: string | null;
  lastRunAt: string | null;
}

interface CellOutput {
  output: string[];
  result: unknown;
  error?: string;
  note?: string;
}

function CellEditor({
  cell,
  onCodeChange,
  onLanguageChange,
  onRun,
  onDelete,
  running,
}: {
  cell: Cell;
  onCodeChange: (id: number, code: string) => void;
  onLanguageChange: (id: number, lang: string) => void;
  onRun: (id: number) => void;
  onDelete: (id: number) => void;
  running: boolean;
}) {
  const output: CellOutput | null = cell.outputJson ? (() => {
    try { return JSON.parse(cell.outputJson); } catch { return null; }
  })() : null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = ta.value.substring(0, start) + "  " + ta.value.substring(end);
      onCodeChange(cell.id, newVal);
      // restore cursor position after state update
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun(cell.id);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Cell toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <Select value={cell.language} onValueChange={(v) => onLanguageChange(cell.id, v)}>
          <SelectTrigger className="h-6 w-28 text-xs border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectContent>
        </Select>
        <span className="flex-1" />
        {cell.lastRunAt && (
          <span className="text-xs text-muted-foreground">
            Last run: {new Date(cell.lastRunAt).toLocaleTimeString()}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRun(cell.id)}
          disabled={running}
          className="h-6 px-2 text-xs"
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
          Run
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(cell.id)}
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Code area */}
      <textarea
        value={cell.code}
        onChange={(e) => onCodeChange(cell.id, e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="w-full font-mono text-sm bg-background text-foreground p-4 resize-none min-h-[80px] focus:outline-none border-0"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace" }}
        rows={Math.max(3, cell.code.split("\n").length + 1)}
        placeholder={`// Write ${cell.language === "python" ? "Python" : "JavaScript"} here...\n// Ctrl+Enter / ⌘+Enter to run`}
      />

      {/* Output */}
      {output && (
        <div className="border-t border-border bg-muted/10 px-4 py-2">
          {output.note && (
            <p className="text-xs text-muted-foreground italic mb-1">{output.note}</p>
          )}
          {output.error && (
            <pre className="text-xs text-destructive whitespace-pre-wrap">{output.error}</pre>
          )}
          {output.output.length > 0 && (
            <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">{output.output.join("\n")}</pre>
          )}
          {output.result !== null && output.result !== undefined && (
            <div className="mt-1">
              <span className="text-xs text-muted-foreground">result: </span>
              <span className="text-xs text-primary font-mono">
                {typeof output.result === "object" ? JSON.stringify(output.result, null, 2) : String(output.result)}
              </span>
            </div>
          )}
          {output.output.length === 0 && output.result === null && !output.error && !output.note && (
            <p className="text-xs text-muted-foreground">✓ Executed (no output)</p>
          )}
        </div>
      )}
    </div>
  );
}

export function NotebookDetailClient({ id }: { id: string }) {
  const notebookId = parseInt(id);
  const [notebook, setNotebook] = React.useState<Notebook | null>(null);
  const [cells, setCells] = React.useState<Cell[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [runningCells, setRunningCells] = React.useState<Set<number>>(new Set());
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState("");

  React.useEffect(() => {
    apiFetch(`/api/notebooks/${notebookId}`)
      .then((data) => {
        setNotebook(data.notebook);
        setNameValue(data.notebook.name);
        setCells(data.cells ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [notebookId]);

  const saveName = async () => {
    if (!notebook || nameValue === notebook.name) { setEditingName(false); return; }
    try {
      const updated = await apiFetch(`/api/notebooks/${notebookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue, description: notebook.description, language: notebook.language }),
      });
      setNotebook(updated);
      setEditingName(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const addCell = async () => {
    try {
      const cell = await apiFetch(`/api/notebooks/${notebookId}/cells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: notebook?.language ?? "javascript" }),
      });
      setCells((prev) => [...prev, cell]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add cell");
    }
  };

  const updateCode = React.useCallback((cellId: number, code: string) => {
    setCells((prev) => prev.map((c) => c.id === cellId ? { ...c, code } : c));
  }, []);

  const updateLanguage = React.useCallback(async (cellId: number, lang: string) => {
    setCells((prev) => prev.map((c) => c.id === cellId ? { ...c, language: lang } : c));
    try {
      await apiFetch(`/api/notebooks/${notebookId}/cells/${cellId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }, [notebookId]);

  const saveCell = React.useCallback(async (cellId: number) => {
    const cell = cells.find((c) => c.id === cellId);
    if (!cell) return;
    try {
      await apiFetch(`/api/notebooks/${notebookId}/cells/${cellId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cell.code }),
      });
    } catch {
      // silent — auto-save on run
    }
  }, [cells, notebookId]);

  const runCell = React.useCallback(async (cellId: number) => {
    setRunningCells((prev) => new Set([...prev, cellId]));
    try {
      await saveCell(cellId);
      const result = await apiFetch(`/api/notebooks/${notebookId}/cells/${cellId}/run`, { method: "POST" });
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId ? { ...c, outputJson: JSON.stringify(result), lastRunAt: new Date().toISOString() } : c
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunningCells((prev) => { const s = new Set(prev); s.delete(cellId); return s; });
    }
  }, [saveCell, notebookId]);

  const deleteCell = React.useCallback(async (cellId: number) => {
    if (!confirm("Delete this cell?")) return;
    try {
      await apiFetch(`/api/notebooks/${notebookId}/cells/${cellId}`, { method: "DELETE" });
      setCells((prev) => prev.filter((c) => c.id !== cellId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }, [notebookId]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-4">
      <Link href="/notebooks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Notebooks
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              className="text-3xl font-bold bg-transparent border-b border-primary outline-none w-full text-foreground"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameValue(notebook?.name ?? ""); } }}
              autoFocus
            />
          ) : (
            <h1
              className="text-3xl font-bold text-foreground cursor-pointer hover:opacity-80"
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {notebook?.name ?? `Notebook #${notebookId}`}
            </h1>
          )}
          {notebook?.description && <p className="text-muted-foreground mt-1">{notebook.description}</p>}
        </div>
        <Badge variant="secondary" className="uppercase text-xs shrink-0">
          {notebook?.language === "javascript" ? "JS" : notebook?.language}
        </Badge>
      </div>

      {/* Cells */}
      <div className="space-y-4">
        {cells.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            No cells yet. Add a cell to get started.
          </p>
        )}
        {cells.map((cell) => (
          <CellEditor
            key={cell.id}
            cell={cell}
            onCodeChange={updateCode}
            onLanguageChange={updateLanguage}
            onRun={runCell}
            onDelete={deleteCell}
            running={runningCells.has(cell.id)}
          />
        ))}
      </div>

      <Button variant="outline" onClick={addCell} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Add Cell
      </Button>
    </div>
  );
}
