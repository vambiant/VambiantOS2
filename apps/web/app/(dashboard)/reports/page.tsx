'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileBarChart,
  FileText,
  GitCompare,
  Plus,
  Search,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

function getReportTypeDisplay(reportType: string | null | undefined): string {
  switch (reportType) {
    case 'explanatory': return 'Erläuterungsbericht';
    case 'proposal': return 'Variantenvergleich';
    case 'submission': return 'Submission';
    default: return reportType ?? '---';
  }
}

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusDisplay(status: string | null | undefined): string {
  switch (status) {
    case 'draft': return 'Entwurf';
    case 'in_progress': return 'In Bearbeitung';
    case 'completed': return 'Abgeschlossen';
    default: return status ?? '---';
  }
}

function getTypColor(typ: string): string {
  switch (typ) {
    case 'explanatory':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'proposal':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
    case 'submission':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getTypIcon(typ: string) {
  switch (typ) {
    case 'explanatory':
      return <FileText className="h-4 w-4" />;
    case 'proposal':
      return <GitCompare className="h-4 w-4" />;
    case 'submission':
      return <FileBarChart className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTyp, setFilterTyp] = useState<string>('all');

  const { data: reportsData, isLoading } = trpc.reports.list.useQuery({
    page: 1,
    pageSize: 50,
    reportType: filterTyp !== 'all' ? (filterTyp as 'explanatory' | 'proposal' | 'submission') : undefined,
    search: searchQuery || undefined,
  });

  const reports = reportsData?.items ?? [];
  const typen = ['all', 'explanatory', 'proposal', 'submission'];
  const typenLabels: Record<string, string> = {
    all: 'Alle',
    explanatory: 'Erläuterungsbericht',
    proposal: 'Variantenvergleich',
    submission: 'Submission',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Berichte</h1>
          <p className="text-muted-foreground">
            Erläuterungsberichte, Variantenvergleiche und Submissionen
          </p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Neuer Bericht
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Berichte suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {typen.map((typ) => (
            <button
              key={typ}
              type="button"
              onClick={() => setFilterTyp(typ)}
              className={`inline-flex h-9 items-center rounded-md px-3 text-xs font-medium transition-colors ${
                filterTyp === typ
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-accent'
              }`}
            >
              {typenLabels[typ] ?? typ}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Titel</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Typ</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Projekt</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Version</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Aktualisiert</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Wird geladen...
                  </td>
                </tr>
              ) : reports.map((report) => (
                <tr key={report.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/reports/${report.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {getTypIcon(report.reportType ?? '')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium hover:underline truncate">{report.title}</p>
                        <p className="text-xs text-muted-foreground">{report.creatorName ?? '---'}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getTypColor(report.reportType ?? '')}`}>
                      {getReportTypeDisplay(report.reportType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">
                    {report.projectName ?? '---'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(report.status)}`}>
                      {getStatusDisplay(report.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                      v{report.version ?? 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(report.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && reports.length === 0 && (
          <div className="px-6 py-12 text-center">
            <FileBarChart className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Keine Berichte gefunden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
