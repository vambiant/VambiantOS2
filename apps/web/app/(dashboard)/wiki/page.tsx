'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Book,
  BookOpen,
  FileText,
  Plus,
  Search,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

function getKategorieColor(isSystem: boolean): string {
  return isSystem
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function WikiPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: normsData, isLoading } = trpc.wiki.normsList.useQuery({
    page: 1,
    pageSize: 50,
    search: searchQuery || undefined,
    isActive: true,
  });

  const norms = normsData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wissensdatenbank</h1>
          <p className="text-muted-foreground">
            Normen, Standards, Vorlagen und Anleitungen
          </p>
        </div>
        <Link
          href="/wiki/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Neuer Artikel
        </Link>
      </div>

      {/* Full-text Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Wissensdatenbank durchsuchen... (z.B. DIN 276, HOAI, Brandschutz)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-12 w-full rounded-xl border border-input bg-transparent pl-12 pr-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{normsData?.total ?? 0} Artikel gesamt</span>
      </div>

      {/* Article Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Wird geladen...
          </div>
        ) : norms.map((norm) => (
            <Link
              key={norm.id}
              href={`/wiki/${norm.id}`}
              className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 bg-opacity-20">
                  <span className="text-purple-700 dark:text-purple-400">
                    <BookOpen className="h-5 w-5" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold group-hover:underline">{norm.title}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {norm.code}
                    </span>
                    {norm.version && (
                      <span className="text-xs text-muted-foreground">
                        {norm.version}
                      </span>
                    )}
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getKategorieColor(norm.companyId === null)}`}>
                      {norm.companyId === null ? 'System' : 'Eigene'}
                    </span>
                  </div>
                </div>
              </div>

              {norm.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {norm.description}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>{norm.validFrom ?? '---'}</span>
                <span>{formatDate(norm.updatedAt)}</span>
              </div>
            </Link>
          ))}

        {!isLoading && norms.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <Book className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Keine Artikel gefunden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
