'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Calendar,
  FileUp,
  HardDrive,
  Search,
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

function getModelTypeLabel(modelType: string | null | undefined): string {
  switch (modelType) {
    case 'architecture': return 'Architektur';
    case 'structural': return 'Tragwerk';
    case 'mep': return 'TGA';
    case 'coordination': return 'Koordination';
    default: return modelType ?? '---';
  }
}

function getFormatLabel(format: string | null | undefined): string {
  switch (format) {
    case 'ifc': return 'IFC';
    case 'rvt': return 'Revit';
    case 'nwd': return 'Navisworks';
    default: return format ?? '---';
  }
}

export default function BIMPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Load projects to use as filter
  const { data: projectsData } = trpc.projects.list.useQuery({
    page: 1,
    pageSize: 100,
  });
  const projects = projectsData?.items ?? [];

  // Load BIM models - requires a projectId, so we query each selected project
  // or show a project selection prompt
  const projectId = selectedProjectId ? parseInt(selectedProjectId, 10) : (projects[0]?.id ?? 0);

  const { data: modelsData, isLoading } = trpc.bim.models.list.useQuery(
    {
      projectId,
      page: 1,
      pageSize: 100,
      search: searchQuery || undefined,
    },
    { enabled: projectId > 0 },
  );

  const models = modelsData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BIM-Modelle</h1>
          <p className="text-muted-foreground">
            Building Information Modeling - Modelle verwalten
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <FileUp className="h-4 w-4" />
          IFC hochladen
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {projects.length === 0 ? (
            <option value="">Keine Projekte vorhanden</option>
          ) : (
            <>
              <option value="">Projekt wählen...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </>
          )}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Modelle suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* No project selected prompt */}
      {projectId === 0 && !isLoading && (
        <div className="py-12 text-center">
          <Box className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            Bitte wählen Sie ein Projekt aus, um BIM-Modelle anzuzeigen
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && projectId > 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Wird geladen...
        </div>
      )}

      {/* Model Cards */}
      {projectId > 0 && !isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => {
            const metadata = (model.metadata ?? {}) as Record<string, unknown>;
            const roomCount = typeof metadata.roomCount === 'number' ? metadata.roomCount : 0;
            const elementCount = typeof metadata.elementCount === 'number' ? metadata.elementCount : 0;
            const fileSize = typeof metadata.fileSize === 'string' ? metadata.fileSize : null;
            return (
              <Link
                key={model.id}
                href={`/bim/${model.id}`}
                className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent/50"
              >
                {/* Model Icon */}
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Box className="h-6 w-6" />
                  </div>
                  <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {getFormatLabel(model.format)}
                  </span>
                </div>

                {/* Info */}
                <div className="mt-4">
                  <h3 className="font-semibold group-hover:underline">{model.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getModelTypeLabel(model.modelType)}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {model.version && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex rounded bg-muted px-1.5 py-0.5 font-medium">
                        {model.version}
                      </span>
                    </div>
                  )}
                  {fileSize && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <HardDrive className="h-3 w-3" />
                      {fileSize}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(model.createdAt)}
                  </div>
                  {roomCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{roomCount} Räume</span>
                    </div>
                  )}
                </div>

                {/* Element Count */}
                {elementCount > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{elementCount.toLocaleString('de-DE')} Elemente</span>
                      {roomCount > 0 && (
                        <span className="text-primary hover:underline">Raumbuch &rarr;</span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}

          {models.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Box className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Keine BIM-Modelle gefunden
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
