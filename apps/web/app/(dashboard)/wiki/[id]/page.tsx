'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function WikiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const normId = parseInt(id, 10);

  const { data: norm, isLoading, error } = trpc.wiki.normsGetById.useQuery(
    { id: normId },
    { enabled: !isNaN(normId) },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Wird geladen...</p>
      </div>
    );
  }

  if (error || !norm) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-destructive">
          {error?.message ?? 'Artikel nicht gefunden'}
        </p>
        <Link href="/wiki" className="mt-4 text-sm text-primary hover:underline">
          Zur Wissensdatenbank
        </Link>
      </div>
    );
  }

  const trades = Array.isArray(norm.trades) ? (norm.trades as string[]) : [];
  const sections = Array.isArray(norm.sections) ? (norm.sections as { id?: string; label?: string; content?: string; sub?: boolean }[]) : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/wiki" className="hover:text-foreground">Wiki</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{norm.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/wiki"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{norm.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
              {norm.code}
            </span>
            {norm.version && <span>Version: {norm.version}</span>}
            <span>&middot;</span>
            <span>Aktualisiert: {formatDate(norm.updatedAt)}</span>
            <span className="inline-flex rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
              {norm.companyId === null ? 'System' : 'Eigene'}
            </span>
          </div>
        </div>
      </div>

      {/* Tags & Trades */}
      {trades.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Gewerke:</span>
          {trades.map((g) => (
            <span
              key={g}
              className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Content Layout */}
      <div className="flex gap-6">
        {/* Table of Contents Sidebar */}
        {sections.length > 0 && (
          <div className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                  Inhaltsverzeichnis
                </h3>
                <nav className="space-y-0.5">
                  {sections.map((section, idx) => (
                    <div
                      key={section.id ?? idx}
                      className={`w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground ${
                        section.sub ? 'pl-5' : ''
                      }`}
                    >
                      {section.label ?? section.id ?? `Abschnitt ${idx + 1}`}
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Article Content */}
        <div className="min-w-0 flex-1 rounded-xl border bg-card p-8 shadow-sm">
          {norm.description ? (
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <p>{norm.description}</p>
              {sections.map((section, idx) => (
                <div key={section.id ?? idx}>
                  {section.sub ? (
                    <h3>{section.label ?? section.id}</h3>
                  ) : (
                    <h2>{section.label ?? section.id}</h2>
                  )}
                  {section.content && <p>{section.content}</p>}
                </div>
              ))}
            </article>
          ) : (
            <div className="py-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Noch kein Inhalt vorhanden
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
