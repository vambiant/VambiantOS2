'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  FileText,
  Folder,
  ListTodo,
  Plus,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'draft': return 'Planung';
    case 'completed': return 'Abgeschlossen';
    case 'on_hold': return 'Pausiert';
    case 'archived': return 'Archiviert';
    default: return status ?? 'unknown';
  }
}

export default function DashboardPage() {
  const userName = 'Max';

  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery(
    { page: 1, pageSize: 5, status: 'active', sortOrder: 'desc' },
  );
  const { data: allProjectsData } = trpc.projects.list.useQuery(
    { page: 1, pageSize: 1 },
  );
  const { data: tasksData } = trpc.tasks.list.useQuery(
    { page: 1, pageSize: 1, status: 'open' },
  );
  const { data: invoicesData } = trpc.finance.invoices.list.useQuery(
    { page: 1, pageSize: 1, status: 'sent' },
  );

  const recentProjects = projectsData?.items ?? [];
  const projectCount = allProjectsData?.total ?? 0;
  const taskCount = tasksData?.total ?? 0;
  const invoiceCount = invoicesData?.total ?? 0;

  const stats = [
    {
      label: 'Aktive Projekte',
      value: String(projectCount),
      change: `${recentProjects.length} zuletzt aktiv`,
      icon: Folder,
      href: '/projects',
    },
    {
      label: 'Offene Aufgaben',
      value: String(taskCount),
      change: 'Status: offen',
      icon: ListTodo,
      href: '/projects',
    },
    {
      label: 'Stunden diese Woche',
      value: '---',
      change: 'Wird geladen...',
      icon: Clock,
      href: '/time-tracking',
    },
    {
      label: 'Ausstehende Rechnungen',
      value: String(invoiceCount),
      change: 'Status: gesendet',
      icon: Receipt,
      href: '/invoices',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Willkommen zurück, {userName}
        </h1>
        <p className="text-muted-foreground">
          Hier ist ein Überblick über Ihre aktuellen Projekte und Aktivitäten.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="mt-1 flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {stat.change}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Neues Projekt
        </Link>
        <Link
          href="/time-tracking"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        >
          <Clock className="h-4 w-4" />
          Zeit erfassen
        </Link>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        >
          <FileText className="h-4 w-4" />
          Neue Rechnung
        </Link>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent projects */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Aktuelle Projekte</h2>
              <Link
                href="/projects"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Alle anzeigen
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y">
              {projectsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))
              ) : recentProjects.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Keine aktiven Projekte vorhanden
                </div>
              ) : (
                recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.projectType ?? '---'} &middot; {getStatusLabel(project.status)}
                      </p>
                    </div>
                    <div className="hidden items-center gap-3 sm:flex">
                      <span className="text-xs text-muted-foreground">
                        {project.code ?? ''}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Upcoming milestones - placeholder since no milestone API */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Anstehende Meilensteine</h2>
            </div>
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              Keine Meilensteine vorhanden
            </div>
          </div>

          {/* Recent activity - placeholder since no global activity API */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Letzte Aktivitäten</h2>
            </div>
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              Keine Aktivitäten vorhanden
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
