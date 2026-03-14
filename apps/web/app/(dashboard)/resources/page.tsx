'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Grid3X3,
  Plus,
  Users,
} from 'lucide-react';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

type TabId = 'allocation' | 'skills';

function getAllokationColor(prozent: number): string {
  if (prozent > 100)
    return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
  if (prozent === 100)
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
  if (prozent >= 80)
    return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
  if (prozent >= 50)
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
}

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('allocation');
  const { toast } = useToast();

  // Load scenarios and let user pick one
  const { data: scenariosData, isLoading: scenariosLoading } = trpc.resources.scenarios.list.useQuery({
    page: 1,
    pageSize: 50,
    isActive: true,
  });
  const scenarios = scenariosData?.items ?? [];
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  // Use first scenario as default if none selected
  const activeScenarioId = selectedScenarioId
    ? parseInt(selectedScenarioId, 10)
    : (scenarios[0]?.id ?? 0);

  // Load allocations for the selected scenario
  const { data: allocationsData, isLoading: allocationsLoading } = trpc.resources.allocations.list.useQuery(
    {
      scenarioId: activeScenarioId,
      page: 1,
      pageSize: 200,
    },
    { enabled: activeScenarioId > 0 },
  );
  const allocations = allocationsData?.items ?? [];

  // Load team members
  const { data: membersData } = trpc.companies.getMembers.useQuery();
  const members = membersData ?? [];

  // Load alerts
  const { data: alertsData } = trpc.resources.alerts.list.useQuery({
    page: 1,
    pageSize: 20,
    isResolved: false,
  });
  const alerts = alertsData?.items ?? [];

  // Build a lookup from userId to member info
  const memberMap = new Map(members.map((m) => {
    const firstName = m.firstName ?? '';
    const lastName = m.lastName ?? '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || m.email;
    const initials = firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : m.email.substring(0, 2).toUpperCase();
    const role = m.role ? m.role.name : 'Mitarbeiter';
    return [m.userId, { name, initials, role, email: m.email }];
  }));

  // Build a 6-month allocation heatmap per member
  // Group allocations by userId, then compute monthly hours
  const now = new Date();
  const monthLabels: string[] = [];
  const monthStarts: Date[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthLabels.push(d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }));
    monthStarts.push(d);
  }

  // Compute allocation percentages per member per month
  // Each allocation has startDate, endDate, hoursPerWeek
  type MemberAlloc = {
    userId: number;
    name: string;
    initials: string;
    role: string;
    monthlyPercent: number[];
  };

  const memberAllocMap = new Map<number, number[]>();

  for (const alloc of allocations) {
    if (!alloc.userId) continue;
    if (!memberAllocMap.has(alloc.userId)) {
      memberAllocMap.set(alloc.userId, Array(6).fill(0));
    }
    const arr = memberAllocMap.get(alloc.userId)!;
    const allocStart = new Date(alloc.startDate);
    const allocEnd = new Date(alloc.endDate);
    const hpw = parseFloat(alloc.hoursPerWeek ?? '0');

    for (let i = 0; i < 6; i++) {
      const monthStart = monthStarts[i]!;
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      // Check overlap
      if (allocStart <= monthEnd && allocEnd >= monthStart) {
        // Approximate: weekly hours -> monthly hours / 160 (40h * 4 weeks) as percentage
        arr[i] = (arr[i] ?? 0) + Math.round((hpw / 40) * 100);
      }
    }
  }

  const memberAllocations: MemberAlloc[] = [];
  for (const [userId, percents] of memberAllocMap) {
    const info = memberMap.get(userId);
    if (info) {
      memberAllocations.push({
        userId,
        name: info.name,
        initials: info.initials,
        role: info.role,
        monthlyPercent: percents,
      });
    }
  }

  // Also add members without allocations
  for (const [userId, info] of memberMap) {
    if (!memberAllocMap.has(userId)) {
      memberAllocations.push({
        userId,
        name: info.name,
        initials: info.initials,
        role: info.role,
        monthlyPercent: Array(6).fill(0),
      });
    }
  }

  const overallocated = memberAllocations.filter((m) => m.monthlyPercent.some((p) => p > 100));

  const isLoading = scenariosLoading || allocationsLoading;

  // Create scenario mutation
  const createScenarioMutation = trpc.resources.scenarios.create.useMutation({
    onSuccess: (newScenario) => {
      toast({
        title: 'Szenario erstellt',
        description: `"${newScenario.name}" wurde erfolgreich erstellt.`,
      });
      setSelectedScenarioId(newScenario.id.toString());
    },
    onError: (err) => {
      toast({
        title: 'Fehler',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ressourcenplanung</h1>
          <p className="text-muted-foreground">
            Kapazitäten und Auslastung verwalten
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const name = `Szenario ${(scenarios.length + 1)}`;
            createScenarioMutation.mutate({ name, isActive: true });
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Neues Szenario
        </button>
      </div>

      {/* Tabs + Scenario Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab('allocation')}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'allocation'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Auslastung
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'skills'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            Skills-Matrix
          </button>
        </div>

        {activeTab === 'allocation' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Szenario:</span>
            <select
              value={selectedScenarioId || (scenarios[0]?.id?.toString() ?? '')}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {scenarios.length === 0 ? (
                <option value="">Keine Szenarien</option>
              ) : (
                scenarios.map((s) => (
                  <option key={s.id} value={s.id.toString()}>
                    {s.name}{s.isBaseline ? ' (Baseline)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Wird geladen...
        </div>
      )}

      {/* Alerts Panel */}
      {activeTab === 'allocation' && !isLoading && alerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
              Warnungen ({alerts.length})
            </h3>
          </div>
          <ul className="mt-2 space-y-1">
            {alerts.slice(0, 5).map((alert) => (
              <li key={alert.id} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span>{alert.message ?? `${alert.alertType} - Warnung`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overallocation warnings from computed data */}
      {activeTab === 'allocation' && !isLoading && alerts.length === 0 && overallocated.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
              Überlastungswarnungen
            </h3>
          </div>
          <ul className="mt-2 space-y-1">
            {overallocated.map((m) => {
              const maxPercent = Math.max(...m.monthlyPercent);
              const monthIdx = m.monthlyPercent.indexOf(maxPercent);
              return (
                <li key={m.userId} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <Link href={`/resources/${m.userId}`} className="font-medium hover:underline">
                    {m.name}
                  </Link>
                  <span className="text-red-500">
                    - {maxPercent}% Auslastung im {monthLabels[monthIdx]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Allocation Heat Map */}
      {activeTab === 'allocation' && !isLoading && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="min-w-[200px] px-4 py-3 text-left font-medium text-muted-foreground">
                    Mitarbeiter
                  </th>
                  {monthLabels.map((monat) => (
                    <th key={monat} className="w-24 px-2 py-3 text-center font-medium text-muted-foreground">
                      {monat}
                    </th>
                  ))}
                  <th className="w-20 px-4 py-3 text-center font-medium text-muted-foreground">
                    &#216;
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {memberAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Keine Mitarbeiter oder Allokationen vorhanden
                    </td>
                  </tr>
                ) : (
                  memberAllocations.map((member) => {
                    const avg = Math.round(
                      member.monthlyPercent.reduce((s, a) => s + a, 0) / member.monthlyPercent.length,
                    );
                    return (
                      <tr key={member.userId} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <Link href={`/resources/${member.userId}`} className="flex items-center gap-3 hover:underline">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {member.initials}
                            </div>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                          </Link>
                        </td>
                        {member.monthlyPercent.map((prozent, idx) => (
                          <td key={`${member.userId}-${idx}`} className="px-2 py-2.5 text-center">
                            <span
                              className={`inline-flex min-w-[48px] items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${getAllokationColor(prozent)}`}
                            >
                              {prozent}%
                            </span>
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex min-w-[48px] items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${getAllokationColor(avg)}`}>
                            {avg}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Skills Matrix - shows members from the team */}
      {activeTab === 'skills' && !isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {members.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              Keine Teammitglieder vorhanden
            </div>
          ) : (
            members.map((m) => {
              const firstName = m.firstName ?? '';
              const lastName = m.lastName ?? '';
              const name = [firstName, lastName].filter(Boolean).join(' ') || m.email;
              const roleName = m.role ? m.role.name : 'Mitarbeiter';
              return (
                <div key={m.userId} className="rounded-xl border bg-card p-4 shadow-sm">
                  <h3 className="font-semibold">{name}</h3>
                  <p className="text-xs text-muted-foreground">{roleName}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{m.email}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Legend */}
      {activeTab === 'allocation' && !isLoading && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Legende:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-gray-200" />
            &lt; 50%
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-blue-200" />
            50-79%
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-200" />
            80-99%
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-amber-200" />
            100%
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-200" />
            &gt; 100%
          </div>
        </div>
      )}
    </div>
  );
}
