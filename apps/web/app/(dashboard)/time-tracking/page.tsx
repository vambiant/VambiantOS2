'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Loader2,
  Plus,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import { Skeleton } from '@vambiant/ui';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

type ViewMode = 'woche' | 'monat' | 'liste';

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'Entwurf':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'Eingereicht':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'Genehmigt':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'Abgelehnt':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
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

function formatShortDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getApiStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'draft': return 'Entwurf';
    case 'submitted': return 'Eingereicht';
    case 'approved': return 'Genehmigt';
    case 'rejected': return 'Abgelehnt';
    default: return status ?? 'Unbekannt';
  }
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const tage = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function TimeTrackingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('liste');
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  // Entries for list view
  const { data: entriesData, isLoading: entriesLoading } = trpc.timeTracking.entries.list.useQuery({
    page: 1,
    pageSize: 50,
    sortOrder: 'desc',
  });

  // Entries for week view
  const { data: weeklyStats } = trpc.timeTracking.stats.weekly.useQuery({
    weekStart,
  });

  const { data: templatesData } = trpc.timeTracking.templates.list.useQuery();

  // Load projects for add form
  const { data: projectsData } = trpc.projects.list.useQuery({
    page: 1,
    pageSize: 100,
  });
  const projects = projectsData?.items ?? [];

  const entries = entriesData?.items ?? [];
  const templatesList = templatesData ?? [];

  // Week stats
  const weekTotalHours = weeklyStats?.totalHours ?? 0;
  const dailyBreakdown = weeklyStats?.dailyBreakdown ?? [];

  // Add entry form state
  const [newProjectId, setNewProjectId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]!);
  const [newBillable, setNewBillable] = useState(true);

  const createMutation = trpc.timeTracking.entries.create.useMutation({
    onSuccess: () => {
      utils.timeTracking.entries.list.invalidate();
      utils.timeTracking.stats.weekly.invalidate();
      setNewProjectId('');
      setNewDescription('');
      setNewHours('');
      setNewBillable(true);
      setShowAddForm(false);
      toast({
        title: 'Eintrag erstellt',
        description: 'Der Zeiteintrag wurde erfolgreich hinzugefügt.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Fehler',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = trpc.timeTracking.entries.delete.useMutation({
    onSuccess: () => {
      utils.timeTracking.entries.list.invalidate();
      utils.timeTracking.stats.weekly.invalidate();
      toast({
        title: 'Eintrag gelöscht',
        description: 'Der Zeiteintrag wurde entfernt.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Fehler',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const submitMutation = trpc.timeTracking.entries.submit.useMutation({
    onSuccess: (result) => {
      utils.timeTracking.entries.list.invalidate();
      utils.timeTracking.stats.weekly.invalidate();
      toast({
        title: 'Woche eingereicht',
        description: `${result.submitted} Einträge wurden zur Genehmigung eingereicht.`,
      });
    },
    onError: (err) => {
      toast({
        title: 'Fehler',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  function handleAddEntry() {
    const hours = parseFloat(newHours);
    if (!hours || hours <= 0) {
      toast({
        title: 'Fehlende Angaben',
        description: 'Bitte geben Sie die Stunden an.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate({
      projectId: newProjectId ? parseInt(newProjectId, 10) : undefined,
      description: newDescription || undefined,
      hours,
      date: new Date(newDate),
      billable: newBillable,
    });
  }

  function handleSubmitWeek() {
    const draftIds = entries
      .filter((e) => e.status === 'draft')
      .map((e) => e.id);
    if (draftIds.length === 0) {
      toast({
        title: 'Keine Entwürfe',
        description: 'Es gibt keine Einträge im Entwurf-Status zum Einreichen.',
        variant: 'destructive',
      });
      return;
    }
    submitMutation.mutate({ ids: draftIds });
  }

  function handleUseTemplate(template: (typeof templatesList)[0]) {
    createMutation.mutate({
      date: new Date(),
      hours: template.hours ? parseFloat(template.hours) : 1,
      description: template.description ?? template.name,
      billable: true,
    });
  }

  // Grand total from entries
  const grandTotal = entries.reduce((sum, e) => sum + parseFloat(e.hours || '0'), 0);

  // Month view: build a map of date -> hours
  const now = new Date();
  const monthYear = now.getFullYear();
  const monthMonth = now.getMonth();
  const daysInMonth = new Date(monthYear, monthMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(monthYear, monthMonth, 1).getDay();
  const emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const entryByDate = new Map<string, number>();
  for (const entry of entries) {
    const dateKey = new Date(entry.date).toISOString().split('T')[0]!;
    entryByDate.set(dateKey, (entryByDate.get(dateKey) ?? 0) + parseFloat(entry.hours || '0'));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zeiterfassung</h1>
          <p className="text-muted-foreground">
            Stunden erfassen und verwalten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Eintrag hinzufügen
          </button>
          <button
            type="button"
            onClick={handleSubmitWeek}
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Woche einreichen
          </button>
        </div>
      </div>

      {/* View Toggle + Week Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {[
            { id: 'woche' as ViewMode, label: 'Woche' },
            { id: 'monat' as ViewMode, label: 'Monat' },
            { id: 'liste' as ViewMode, label: 'Liste' },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewMode(v.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === v.id
                  ? 'bg-background text-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {viewMode === 'woche' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={prevWeek}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              KW {getWeekNumber(weekStart)} &middot; {formatShortDate(weekStart)} - {formatShortDate(weekEnd)}.{weekEnd.getFullYear()}
            </div>
            <button
              type="button"
              onClick={nextWeek}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {viewMode === 'woche' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{weekTotalHours.toFixed(1)}h</span>
            <span className="text-xs text-muted-foreground">/ {weeklyStats?.targetHours ?? 40}h</span>
          </div>
        )}
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold">Eintrag hinzufügen</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Projekt</label>
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Projekt wählen...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id.toString()}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Datum</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
              <input
                type="text"
                placeholder="Aufgabe..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Stunden</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                placeholder="0,0"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newBillable}
                  onChange={(e) => setNewBillable(e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                Abrechenbar
              </label>
              <button
                type="button"
                onClick={handleAddEntry}
                disabled={createMutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates / Favorites */}
      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5" />
          Vorlagen:
        </span>
        {templatesList.length === 0 ? (
          <span className="text-xs text-muted-foreground">Keine Vorlagen vorhanden</span>
        ) : (
          templatesList.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleUseTemplate(t)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              {t.name}
            </button>
          ))
        )}
      </div>

      {/* Week View */}
      {viewMode === 'woche' && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="min-w-[250px] px-4 py-3 text-left font-medium text-muted-foreground">
                    Projekt
                  </th>
                  {weekDates.map((date, idx) => (
                    <th key={idx} className="w-20 px-2 py-3 text-center font-medium text-muted-foreground">
                      <div>{tage[idx]}</div>
                      <div className="text-[10px] font-normal">{formatShortDate(date)}</div>
                    </th>
                  ))}
                  <th className="w-20 px-4 py-3 text-right font-medium text-muted-foreground">Summe</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {weeklyStats?.projectTotals && weeklyStats.projectTotals.length > 0 ? (
                  weeklyStats.projectTotals.map((proj) => {
                    const projectDaily = dailyBreakdown.map((d) => {
                      const pb = d.projectBreakdown.find((p) => p.projectId === proj.projectId);
                      return pb?.hours ?? 0;
                    });
                    return (
                      <tr key={proj.projectId} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{proj.projectName}</p>
                        </td>
                        {projectDaily.map((hours, idx) => (
                          <td key={idx} className="px-2 py-2.5 text-center">
                            {hours > 0 ? (
                              <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                {hours.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right font-bold">
                          {proj.hours.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Keine Zeiteinträge in dieser Woche
                    </td>
                  </tr>
                )}

                {/* Totals Row */}
                <tr className="border-t-2 bg-muted/50 font-bold">
                  <td className="px-4 py-3">Summe</td>
                  {dailyBreakdown.map((d, idx) => (
                    <td
                      key={`total-${idx}`}
                      className={`px-2 py-3 text-center ${d.hours > 8 ? 'text-red-600' : ''}`}
                    >
                      {d.hours > 0 ? d.hours.toFixed(1) : '-'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-base">{weekTotalHours.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'liste' && (
        <div className="rounded-xl border bg-card shadow-sm">
          {entriesLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Keine Zeiteinträge vorhanden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Datum</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Projekt</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Modul</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Beschreibung</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Stunden</th>
                    <th className="px-6 py-3 text-center font-medium text-muted-foreground">Abr.</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-3 w-[50px]" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-6 py-3 text-muted-foreground">{formatDate(entry.date)}</td>
                      <td className="px-6 py-3 font-medium">{entry.projectName ?? '---'}</td>
                      <td className="px-6 py-3 text-muted-foreground">{entry.moduleName ?? '---'}</td>
                      <td className="px-6 py-3">{entry.description ?? '---'}</td>
                      <td className="px-6 py-3 text-right font-bold">{parseFloat(entry.hours).toFixed(1)}</td>
                      <td className="px-6 py-3 text-center">
                        {entry.billable ? (
                          <span className="text-green-600">&#10003;</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(getApiStatusLabel(entry.status))}`}>
                          {getApiStatusLabel(entry.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {entry.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate({ id: entry.id })}
                            disabled={deleteMutation.isPending}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Eintrag löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Month View */}
      {viewMode === 'monat' && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </h3>
            <span className="text-sm font-bold">{grandTotal.toFixed(1)}h gesamt</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {tage.map((tag) => (
              <div key={tag} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {tag}
              </div>
            ))}
            {/* Empty cells for month start */}
            {Array.from({ length: emptyDays }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-20 rounded-lg bg-muted/20 p-1" />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateKey = `${monthYear}-${String(monthMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayOfWeek = new Date(monthYear, monthMonth, day).getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isToday = day === now.getDate() && monthMonth === now.getMonth() && monthYear === now.getFullYear();
              const hours = entryByDate.get(dateKey) ?? 0;
              return (
                <div
                  key={day}
                  className={`h-20 rounded-lg border p-1.5 text-xs ${
                    isWeekend ? 'bg-muted/30' : 'hover:bg-accent/30'
                  } ${isToday ? 'ring-2 ring-primary/30' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>{day}</span>
                    {hours > 0 && (
                      <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary">
                        {hours.toFixed(1)}h
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
