'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronDown,
  Euro,
  Filter,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

type ApiStatus =
  | 'discovered'
  | 'qualified'
  | 'analyzed'
  | 'bid_prepared'
  | 'submitted'
  | 'awarded'
  | 'cancelled';

interface PipelineStage {
  key: ApiStatus;
  label: string;
}

const stages: PipelineStage[] = [
  { key: 'discovered', label: 'Entdeckt' },
  { key: 'qualified', label: 'Qualifiziert' },
  { key: 'analyzed', label: 'Analysiert' },
  { key: 'bid_prepared', label: 'Angebot erstellt' },
  { key: 'submitted', label: 'Eingereicht' },
  { key: 'awarded', label: 'Vergeben' },
];

function getStageColor(status: string): string {
  switch (status) {
    case 'discovered':
      return 'bg-gray-100 border-gray-300 dark:bg-gray-800/40';
    case 'qualified':
      return 'bg-blue-50 border-blue-300 dark:bg-blue-900/10';
    case 'analyzed':
      return 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/10';
    case 'bid_prepared':
      return 'bg-amber-50 border-amber-300 dark:bg-amber-900/10';
    case 'submitted':
      return 'bg-purple-50 border-purple-300 dark:bg-purple-900/10';
    case 'awarded':
      return 'bg-green-50 border-green-300 dark:bg-green-900/10';
    default:
      return 'bg-gray-50 border-gray-300';
  }
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
  if (score >= 70) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400';
  return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getDaysLeft(dateStr: string | Date | null | undefined): number {
  if (!dateStr) return 999;
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

export default function TendersPage() {
  const [showFilters, setShowFilters] = useState(false);

  const { data: tendersData, isLoading } = trpc.tenders.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  const tenders = tendersData?.items ?? [];

  // Group tenders by status for kanban
  const tendersByStage = stages.map((stage) => ({
    ...stage,
    items: tenders.filter((t) => t.status === stage.key),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ausschreibungen</h1>
          <p className="text-muted-foreground">
            Akquisitions-Pipeline und Ausschreibungsmanagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            SPEN-Sync: Aktiv
            <span className="h-2 w-2 rounded-full bg-green-500" />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Manuell erfassen
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        >
          <Filter className="h-4 w-4" />
          Filter
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm text-muted-foreground">
          {isLoading ? '...' : `${tenders.length} Ausschreibungen in der Pipeline`}
        </span>
      </div>

      {showFilters && (
        <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Region</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option>Alle Regionen</option>
              <option>Berlin</option>
              <option>Brandenburg</option>
              <option>Potsdam</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Gebäudetyp</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option>Alle Typen</option>
              <option>Wohnungsbau</option>
              <option>Schulbau</option>
              <option>Bürobau</option>
              <option>Gesundheitsbau</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Frist bis</label>
            <input
              type="date"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Kanban Pipeline */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Wird geladen...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {tendersByStage.map((stage) => (
            <div key={stage.key} className="w-72 shrink-0">
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{stage.label}</h3>
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-bold text-muted-foreground">
                  {stage.items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {stage.items.map((tender) => {
                  const daysLeft = getDaysLeft(tender.submissionDeadline);
                  const score = tender.compositeScore ? parseFloat(tender.compositeScore) : 0;
                  return (
                    <Link
                      key={tender.id}
                      href={`/tenders/${tender.id}`}
                      className={`block rounded-xl border p-4 shadow-sm transition-colors hover:shadow-md ${getStageColor(tender.status ?? 'discovered')}`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-semibold leading-tight">
                          {tender.title}
                        </h4>
                        {score > 0 && (
                          <span
                            className={`ml-2 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${getScoreColor(score)}`}
                          >
                            <Star className="mr-0.5 h-2.5 w-2.5" />
                            {Math.round(score)}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {tender.contractingAuthority ?? '---'}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {tender.locationCity && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {tender.locationCity}
                          </span>
                        )}
                        {tender.estimatedValueNet && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Euro className="h-3 w-3" />
                            {tender.estimatedValueNet} {tender.currency ?? 'EUR'}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        {tender.buildingType && (
                          <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {tender.buildingType}
                          </span>
                        )}
                        {tender.submissionDeadline && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              daysLeft > 14
                                ? 'text-green-600'
                                : daysLeft > 7
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {daysLeft > 0 ? `${daysLeft}T` : 'Abgelaufen'}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}

                {stage.items.length === 0 && (
                  <div className="rounded-xl border border-dashed p-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      Keine Einträge
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
