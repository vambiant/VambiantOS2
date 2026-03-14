'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Building,
  Calendar,
  Image,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

function getTypColor(typ: string | null | undefined): string {
  switch (typ) {
    case 'Wohnungsbau':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Bürobau':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'Schulbau':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'Sanierung':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'Sozialbau':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400';
    case 'Sportbau':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function ReferencesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTyp, setFilterTyp] = useState<string>('all');

  const { data: refsData, isLoading } = trpc.references.list.useQuery({
    page: 1,
    pageSize: 50,
    buildingType: filterTyp !== 'all' ? filterTyp : undefined,
    search: searchQuery || undefined,
  });

  const references = refsData?.items ?? [];

  // Derive unique building types from loaded data for filter buttons
  const gebaeudetypen = [...new Set(references.map((r) => r.buildingType).filter(Boolean))].sort() as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referenzen</h1>
          <p className="text-muted-foreground">
            Projektportfolio und Referenzdatenbank
          </p>
        </div>
        <Link
          href="/references/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Neue Referenz
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Referenzen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <select
          value={filterTyp}
          onChange={(e) => setFilterTyp(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">Alle Gebäudetypen</option>
          {gebaeudetypen.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Portfolio Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Wird geladen...
          </div>
        ) : references.map((ref) => {
          const location = ref.location as Record<string, string> | null;
          const completionYear = ref.completionDate ? new Date(ref.completionDate).getFullYear() : null;
          return (
            <Link
              key={ref.id}
              href={`/references/${ref.id}`}
              className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-colors hover:bg-accent/30"
            >
              {/* Image Placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-muted/80 to-muted/40">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getTypColor(ref.buildingType)}`}>
                    {ref.buildingType ?? '---'}
                  </span>
                </div>
                {completionYear && (
                  <div className="absolute bottom-3 right-3">
                    <span className="inline-flex rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {completionYear}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold group-hover:underline">{ref.title}</h3>
                {ref.description && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {ref.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                  {location?.city && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {location.city}
                    </span>
                  )}
                  {ref.teamSize && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {ref.teamSize} Pers.
                    </span>
                  )}
                  {ref.projectValue && (
                    <span className="ml-auto font-medium text-foreground">
                      {ref.projectValue} EUR
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {!isLoading && references.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <Award className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Keine Referenzen gefunden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
