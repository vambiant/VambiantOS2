'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Folder,
  Grid3X3,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Skeleton } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'draft':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'completed':
    case 'archived':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'draft': return 'Planung';
    case 'completed': return 'Abgeschlossen';
    case 'on_hold': return 'Pausiert';
    case 'archived': return 'Archiviert';
    case 'cancelled': return 'Storniert';
    default: return status ?? 'unknown';
  }
}

function formatCurrency(amount: string | null): string {
  if (!amount) return '---';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(num);
}

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = trpc.projects.list.useQuery({
    page,
    pageSize: 20,
    search: searchQuery || undefined,
    status: statusFilter as 'draft' | 'active' | 'on_hold' | 'completed' | 'archived' | 'cancelled' | undefined,
    sortOrder: 'desc',
  });

  const filteredProjects = data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projekte</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Projekte und deren Fortschritt
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Neues Projekt
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Projekte suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>
        <div className="flex rounded-md border shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex h-10 items-center rounded-l-md px-3 text-sm transition-colors ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex h-10 items-center rounded-r-md border-l px-3 text-sm transition-colors ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-destructive">
            Fehler beim Laden der Projekte: {error.message}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Projekt
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Auftraggeber
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Projektleiter
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                    Budget
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/projects/${project.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Folder className="h-4 w-4" />
                        </div>
                        <span className="font-medium hover:underline">
                          {project.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {project.clientName ?? '---'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(project.status)}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {project.projectType ?? '---'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {project.projectManagerName ?? '---'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatCurrency(project.budgetNet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Keine Projekte gefunden
              </p>
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <p className="text-sm text-muted-foreground">
                {data.total} Projekte, Seite {data.page} von {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold group-hover:underline">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {project.clientName ?? '---'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(project.status)}`}
                >
                  {getStatusLabel(project.status)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {project.projectType ?? '---'}
                </span>
              </div>

              <div className="mt-3 text-right">
                <span className="text-sm font-medium">{formatCurrency(project.budgetNet)}</span>
              </div>
            </Link>
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Keine Projekte gefunden
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
