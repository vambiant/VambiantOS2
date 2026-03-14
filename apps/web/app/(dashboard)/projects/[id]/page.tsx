'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  Edit3,
  ListTodo,
  Loader2,
  Milestone as MilestoneIcon,
  TrendingUp,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
  Textarea,
} from '@vambiant/ui';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function getModuleStatusColor(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'active':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'planned':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'cancelled':
      return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getModuleStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'completed': return 'Abgeschlossen';
    case 'active': return 'In Bearbeitung';
    case 'planned': return 'Geplant';
    case 'on_hold': return 'Pausiert';
    case 'cancelled': return 'Storniert';
    default: return status ?? 'Unbekannt';
  }
}

function getMilestoneStatusColor(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'pending':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
    case 'overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getMilestoneStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'completed': return 'Erledigt';
    case 'in_progress': return 'In Bearbeitung';
    case 'pending': return 'Offen';
    case 'overdue': return 'Ueberfaellig';
    default: return status ?? 'Unbekannt';
  }
}

function getMilestoneIcon(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-600" />;
    default:
      return <Circle className="h-4 w-4 text-gray-400" />;
  }
}

function formatCurrency(amount: string | null | undefined): string {
  if (!amount) return '---';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(num);
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.id as string;
  const numericId = Number(projectId);
  const { toast } = useToast();

  const [note, setNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const { data: project } = trpc.projects.getById.useQuery(
    { id: numericId },
    { enabled: !isNaN(numericId) && numericId > 0 },
  );

  const { data: modulesData, isLoading: modulesLoading } = trpc.modules.list.useQuery(
    { projectId: numericId },
    { enabled: !isNaN(numericId) && numericId > 0 },
  );
  const { data: tasksData } = trpc.tasks.list.useQuery(
    { projectId: numericId, page: 1, pageSize: 1 },
    { enabled: !isNaN(numericId) && numericId > 0 },
  );
  const { data: milestonesData } = trpc.milestones.list.useQuery(
    { projectId: numericId },
    { enabled: !isNaN(numericId) && numericId > 0 },
  );
  const { data: activityData } = trpc.projects.getActivities.useQuery(
    { projectId: numericId, page: 1, pageSize: 5 },
    { enabled: !isNaN(numericId) && numericId > 0 },
  );

  const utils = trpc.useUtils();
  const updateProjectMutation = trpc.projects.update.useMutation();

  // Initialize note from project data
  useEffect(() => {
    if (project?.quickNote && note === '') {
      setNote(project.quickNote);
    }
  }, [project?.quickNote]);

  const modules = modulesData ?? [];
  const totalTasks = tasksData?.total ?? 0;
  const budgetHoursTotal = modules.reduce((sum, m) => sum + (m.plannedHours ? parseFloat(m.plannedHours) : 0), 0);
  const overallProgress = modules.length > 0
    ? Math.round(modules.reduce((sum, m) => sum + parseFloat(m.progressPercentage || '0'), 0) / modules.length)
    : 0;
  const completedModules = modules.filter((m) => m.status === 'completed').length;

  const handleSaveNote = async () => {
    if (isEditingNote) {
      setIsSavingNote(true);
      try {
        await updateProjectMutation.mutateAsync({
          id: numericId,
          quickNote: note,
        });
        toast({
          title: 'Notiz gespeichert',
          description: 'Die Projektnotiz wurde aktualisiert.',
        });
        utils.projects.getById.invalidate({ id: numericId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        toast({
          title: 'Fehler',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsSavingNote(false);
      }
    }
    setIsEditingNote(!isEditingNote);
  };

  // Upcoming milestones (non-completed, sorted by date, max 5)
  const upcomingMilestones = (milestonesData ?? [])
    .filter((m) => m.status !== 'completed' && m.status !== 'cancelled')
    .slice(0, 5);

  const stats = [
    {
      label: 'Fortschritt',
      value: `${overallProgress}%`,
      icon: TrendingUp,
      detail: `${completedModules}/${modules.length} Module`,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    },
    {
      label: 'Aufgaben',
      value: `${totalTasks}`,
      icon: ListTodo,
      detail: `${totalTasks} erfasst`,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    },
    {
      label: 'Stunden',
      value: budgetHoursTotal.toLocaleString('de-DE'),
      icon: Clock,
      detail: `geplant`,
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
    },
    {
      label: 'Budget',
      value: formatCurrency(project?.budgetNet),
      icon: DollarSign,
      detail: project?.estimatedHours ? `${parseFloat(project.estimatedHours).toLocaleString('de-DE')} h geschaetzt` : 'Nicht festgelegt',
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  <div className={`rounded-lg p-2 ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {stat.detail}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Module progress - takes 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Module (Leistungsphasen)</CardTitle>
              <Link
                href={`/projects/${projectId}/modules`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Alle anzeigen
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {modulesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-1.5 w-full" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  ))
                ) : modules.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Keine Module vorhanden
                  </p>
                ) : (
                  modules.map((module) => {
                    const progress = parseFloat(module.progressPercentage || '0');
                    return (
                      <div
                        key={module.id}
                        className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {module.hoaiPhase ? `LP ${module.hoaiPhase} - ` : ''}{module.name}
                            </p>
                            <Badge
                              className={`shrink-0 text-[10px] ${getModuleStatusColor(module.status)}`}
                            >
                              {getModuleStatusLabel(module.status)}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1">
                              <Progress value={progress} className="h-1.5" />
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {module.tasksCompleted}/{module.taskCount} Aufgaben
                            </span>
                            <span>&middot;</span>
                            <span>
                              {module.plannedHours ? parseFloat(module.plannedHours).toLocaleString('de-DE') : '0'} h geplant
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick note */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Projektnotiz</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveNote}
                disabled={isSavingNote}
              >
                {isSavingNote ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Edit3 className="mr-1 h-3.5 w-3.5" />
                )}
                {isEditingNote ? 'Speichern' : 'Bearbeiten'}
              </Button>
            </CardHeader>
            <CardContent>
              {isEditingNote ? (
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Notizen zum Projekt..."
                  rows={4}
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {note || 'Keine Notizen vorhanden. Klicken Sie auf "Bearbeiten", um eine Notiz hinzuzufuegen.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Upcoming milestones */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Meilensteine</CardTitle>
              <Link
                href={`/projects/${projectId}/milestones`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Alle
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingMilestones.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMilestones.map((ms) => (
                    <div key={ms.id} className="flex items-start gap-3">
                      {getMilestoneIcon(ms.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{ms.name}</p>
                          <Badge className={`shrink-0 text-[10px] ${getMilestoneStatusColor(ms.status)}`}>
                            {getMilestoneStatusLabel(ms.status)}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {ms.targetDate && (
                            <span className={
                              new Date(ms.targetDate) < new Date() && ms.status !== 'completed'
                                ? 'text-destructive font-medium'
                                : ''
                            }>
                              {new Date(ms.targetDate).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {ms.moduleName && (
                            <>
                              <span>&middot;</span>
                              <span>{ms.moduleName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Keine anstehenden Meilensteine
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Aktivitaet</CardTitle>
              <Link
                href={`/projects/${projectId}/activity`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Alle
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityData && activityData.items.length > 0 ? (
                  activityData.items.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-muted text-[10px] font-medium">
                          {activity.userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.userName}</span>{' '}
                          {activity.description ?? activity.action}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Keine Aktivitaeten vorhanden
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
