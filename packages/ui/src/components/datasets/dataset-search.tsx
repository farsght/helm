"use client"

import * as React from "react"
import { AlertTriangle, Search, SearchX } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Progress } from "../ui/progress"
import { Skeleton } from "../ui/skeleton"
import { EmptyState } from "../page/empty-state"
import { ErrorState } from "../page/error-state"
import { useSearchDatasetMutation } from "../../hooks/use-datasets"
import { cn } from "../../lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type VectorizeMatch = { id: string; score: number; metadata?: Record<string, unknown> }
type AiSearchMatch = { key: string; score: number; text?: string }
type NoneMatch = { recordId: string; title?: string; snippet?: string }

type SearchResult =
  | { backend: "vectorize"; matches: VectorizeMatch[]; indexingPending?: boolean }
  | { backend: "ai_search"; matches: AiSearchMatch[] }
  | { backend: "none"; matches: NoneMatch[] }

// ─── Result item components ──────────────────────────────────────────────────

function VectorizeResultItem({ match }: { match: VectorizeMatch }) {
  return (
    <div className="rounded-md border bg-card p-4 space-y-1">
      {match.metadata && Object.keys(match.metadata).length > 0 ? (
        <dl className="space-y-1">
          {Object.entries(match.metadata).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <dt className="text-xs text-muted-foreground font-medium shrink-0">{key}:</dt>
              <dd className="text-xs truncate">{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs font-mono text-muted-foreground">{match.id}</p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Progress value={match.score * 100} className="h-1 flex-1" />
        <span className="text-xs text-muted-foreground font-mono shrink-0">
          {match.score.toFixed(3)}
        </span>
      </div>
    </div>
  )
}

function AiSearchResultItem({ match }: { match: AiSearchMatch }) {
  return (
    <div className="rounded-md border bg-card p-4 space-y-1">
      {match.text ? (
        <p className="text-sm">{match.text}</p>
      ) : (
        <code className="text-xs font-mono">{match.key}</code>
      )}
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-muted-foreground">{match.key}</code>
        <span className="text-xs text-muted-foreground font-mono ml-auto">{match.score.toFixed(3)}</span>
      </div>
    </div>
  )
}

function NoneResultItem({ match }: { match: NoneMatch }) {
  return (
    <div className="rounded-md border bg-card p-4 space-y-1">
      <p className="text-sm font-medium">{match.title ?? match.recordId}</p>
      {match.snippet && (
        <p className="text-xs text-muted-foreground line-clamp-2">{match.snippet}</p>
      )}
    </div>
  )
}

// ─── DatasetSearch ─────────────────────────────────────────────────────────────

export function DatasetSearch({ datasetId, className }: { datasetId: string; className?: string }) {
  const [query, setQuery] = React.useState("")
  const searchMutation = useSearchDatasetMutation()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    searchMutation.mutate({ id: datasetId, body: { query: query.trim() } })
  }

  const result = searchMutation.data as SearchResult | undefined
  const hasSearched = searchMutation.isSuccess || searchMutation.isError

  return (
    <div data-slot="dataset-search" className={cn("space-y-4", className)}>
      {/* Search form */}
      <form className="flex gap-2" onSubmit={handleSearch}>
        <Label className="sr-only" htmlFor="dataset-search-input">
          Search query
        </Label>
        <Input
          id="dataset-search-input"
          type="search"
          placeholder="Search dataset..."
          className="flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={searchMutation.isPending}>
          {searchMutation.isPending ? "Searching..." : "Search dataset"}
        </Button>
      </form>

      {/* Loading state */}
      {searchMutation.isPending && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      )}

      {/* Error state */}
      {searchMutation.isError && (
        <ErrorState
          title="Search failed"
          description="Try a different query or check your connection."
          onRetry={() => searchMutation.mutate({ id: datasetId, body: { query: query.trim() } })}
        />
      )}

      {/* Results */}
      {searchMutation.isSuccess && result && (
        <>
          {/* Backend indicator */}
          <p className="text-xs text-muted-foreground">
            {result.backend === "vectorize" && (
              <span className="text-primary">Vector search</span>
            )}
            {result.backend === "ai_search" && (
              <span className="text-[var(--color-chart-2)]">AI search</span>
            )}
            {result.backend === "none" && (
              <span>Keyword search</span>
            )}
            {" "}— {result.matches.length} result{result.matches.length !== 1 ? "s" : ""}
          </p>

          {/* indexingPending notice (vectorize only) */}
          {result.backend === "vectorize" && result.indexingPending && (
            <div className="flex gap-2 rounded-md bg-[var(--color-chart-4)]/10 px-4 py-2 text-xs text-[var(--color-chart-4)]">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              Results may be incomplete while indexing is in progress.
            </div>
          )}

          {/* Match list — discriminated union */}
          {result.matches.length === 0 ? (
            <EmptyState
              title="No results"
              description="Try a different query or broaden your search."
              icon={SearchX}
            />
          ) : (
            <div className="space-y-2">
              {result.backend === "vectorize" &&
                result.matches.map((match) => (
                  <VectorizeResultItem key={match.id} match={match} />
                ))}
              {result.backend === "ai_search" &&
                result.matches.map((match) => (
                  <AiSearchResultItem key={match.key} match={match} />
                ))}
              {result.backend === "none" &&
                result.matches.map((match) => (
                  <NoneResultItem key={match.recordId} match={match} />
                ))}
            </div>
          )}
        </>
      )}

      {/* Pre-search empty state */}
      {!hasSearched && !searchMutation.isPending && (
        <EmptyState
          title="Search this dataset"
          description="Enter a query above to find records."
          icon={Search}
        />
      )}
    </div>
  )
}
