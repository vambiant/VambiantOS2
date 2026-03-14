'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  Phone,
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

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = parseInt(id, 10);

  // Load the member details from the company members list
  const { data: membersData, isLoading } = trpc.companies.getMembers.useQuery();
  const members = membersData ?? [];
  const member = members.find((m) => m.userId === userId);

  // Load scenarios to find active one for allocations
  const { data: scenariosData } = trpc.resources.scenarios.list.useQuery({
    page: 1,
    pageSize: 10,
    isActive: true,
  });
  const scenarios = scenariosData?.items ?? [];
  const activeScenarioId = scenarios[0]?.id ?? 0;

  // Load allocations for this user in the active scenario
  const { data: allocationsData } = trpc.resources.allocations.list.useQuery(
    {
      scenarioId: activeScenarioId,
      userId,
      page: 1,
      pageSize: 100,
    },
    { enabled: activeScenarioId > 0 },
  );
  const allocations = allocationsData?.items ?? [];

  // Load projects to map project names
  const { data: projectsData } = trpc.projects.list.useQuery({
    page: 1,
    pageSize: 200,
  });
  const projectsMap = new Map(
    (projectsData?.items ?? []).map((p) => [p.id, p.name]),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Wird geladen...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-destructive">Mitarbeiter nicht gefunden</p>
        <Link href="/resources" className="mt-4 text-sm text-primary hover:underline">
          Zurück zur Ressourcenplanung
        </Link>
      </div>
    );
  }

  const firstName = member.firstName ?? '';
  const lastName = member.lastName ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || member.email;
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : member.email.substring(0, 2).toUpperCase();
  const roleName = member.role ? member.role.name : 'Mitarbeiter';

  // Build 6-month timeline from allocations
  const now = new Date();
  const monthLabels: string[] = [];
  const monthStarts: Date[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthLabels.push(d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }));
    monthStarts.push(d);
  }

  // Build per-project allocation timeline
  const projectAllocMap = new Map<number, { projectName: string; monthlyPercent: number[] }>();

  for (const alloc of allocations) {
    if (!alloc.projectId) continue;
    if (!projectAllocMap.has(alloc.projectId)) {
      projectAllocMap.set(alloc.projectId, {
        projectName: projectsMap.get(alloc.projectId) ?? `Projekt #${alloc.projectId}`,
        monthlyPercent: Array(6).fill(0),
      });
    }
    const entry = projectAllocMap.get(alloc.projectId)!;
    const allocStart = new Date(alloc.startDate);
    const allocEnd = new Date(alloc.endDate);
    const hpw = parseFloat(alloc.hoursPerWeek ?? '0');

    for (let i = 0; i < 6; i++) {
      const monthStart = monthStarts[i]!;
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      if (allocStart <= monthEnd && allocEnd >= monthStart) {
        entry.monthlyPercent[i] = (entry.monthlyPercent[i] ?? 0) + Math.round((hpw / 40) * 100);
      }
    }
  }

  const allocationTimeline = [...projectAllocMap.values()];
  const totals = monthLabels.map((_, idx) =>
    allocationTimeline.reduce((sum, entry) => sum + (entry.monthlyPercent[idx] ?? 0), 0),
  );

  const projectColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-gray-400',
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/resources" className="hover:text-foreground">Ressourcen</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/resources"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">{roleName}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">E-Mail</p>
            <a href={`mailto:${member.email}`} className="text-sm font-medium hover:underline">
              {member.email}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Beigetreten</p>
            <p className="text-sm font-medium">{formatDate(member.joinedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Rolle</p>
            <p className="text-sm font-medium">{roleName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Aktive Allokationen</p>
            <p className="text-sm font-medium">{allocations.length}</p>
          </div>
        </div>
      </div>

      {/* Allocation Timeline */}
      <div>
        <h2 className="text-lg font-semibold">Auslastungszeitstrahl</h2>
        <div className="mt-3 rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="min-w-[200px] px-4 py-3 text-left font-medium text-muted-foreground">Projekt</th>
                  {monthLabels.map((m) => (
                    <th key={m} className="w-24 px-2 py-3 text-center font-medium text-muted-foreground">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {allocationTimeline.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Keine Allokationen vorhanden
                    </td>
                  </tr>
                ) : (
                  allocationTimeline.map((entry, entryIdx) => (
                    <tr key={entry.projectName} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 shrink-0 rounded-sm ${projectColors[entryIdx % projectColors.length]}`} />
                          <p className="font-medium">{entry.projectName}</p>
                        </div>
                      </td>
                      {entry.monthlyPercent.map((prozent, idx) => (
                        <td key={`${entry.projectName}-${idx}`} className="px-2 py-2.5 text-center">
                          {prozent > 0 && (
                            <div className="mx-auto h-6 rounded" style={{ width: `${Math.min(prozent, 100)}%` }}>
                              <div className={`h-full rounded ${projectColors[entryIdx % projectColors.length]} opacity-60`} />
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">{prozent}%</span>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {allocationTimeline.length > 0 && (
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td className="px-4 py-3">Gesamt</td>
                    {totals.map((total, idx) => (
                      <td
                        key={`total-${idx}`}
                        className={`px-2 py-3 text-center ${total > 100 ? 'text-red-600' : ''}`}
                      >
                        {total}%
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
