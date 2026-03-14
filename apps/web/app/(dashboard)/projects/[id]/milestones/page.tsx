'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Filter,
  Loader2,
  Milestone,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@vambiant/ui';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function getStatusColor(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'pending':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
    case 'overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'cancelled':
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-500';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'completed': return 'Erledigt';
    case 'in_progress': return 'In Bearbeitung';
    case 'pending': return 'Offen';
    case 'overdue': return 'Ueberfaellig';
    case 'cancelled': return 'Storniert';
    default: return status ?? 'Unbekannt';
  }
}

function getStatusIcon(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-blue-600" />;
    case 'pending':
      return <Circle className="h-5 w-5 text-gray-400" />;
    case 'overdue':
      return <Clock className="h-5 w-5 text-red-600" />;
    case 'cancelled':
      return <Circle className="h-5 w-5 text-gray-400" />;
    default:
      return <Circle className="h-5 w-5 text-gray-400" />;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const statusOptions = [
  { value: 'pending', label: 'Offen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'completed', label: 'Erledigt' },
  { value: 'overdue', label: 'Ueberfaellig' },
  { value: 'cancelled', label: 'Storniert' },
];

interface MilestoneFormState {
  id?: number;
  name: string;
  description: string;
  targetDate: string;
  status: string;
  moduleId: string;
}

const defaultForm: MilestoneFormState = {
  name: '',
  description: '',
  targetDate: '',
  status: 'pending',
  moduleId: '',
};

export default function MilestonesPage() {
  const params = useParams();
  const projectId = Number(params.id as string);
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [milestoneForm, setMilestoneForm] = useState<MilestoneFormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const utils = trpc.useUtils();

  const { data: milestones, isLoading, error } = trpc.milestones.list.useQuery(
    {
      projectId,
      status: statusFilter !== 'all'
        ? (statusFilter as 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled')
        : undefined,
    },
    { enabled: !isNaN(projectId) && projectId > 0 },
  );

  const { data: modulesData } = trpc.modules.list.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) && projectId > 0 },
  );

  const createMutation = trpc.milestones.create.useMutation();
  const updateMutation = trpc.milestones.update.useMutation();
  const deleteMutation = trpc.milestones.delete.useMutation();

  const handleCreateOpen = () => {
    setMilestoneForm(defaultForm);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEditOpen = (ms: NonNullable<typeof milestones>[number]) => {
    setMilestoneForm({
      id: ms.id,
      name: ms.name,
      description: ms.description || '',
      targetDate: ms.targetDate || '',
      status: ms.status || 'pending',
      moduleId: ms.moduleId ? String(ms.moduleId) : '',
    });
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (isSubmitting || !milestoneForm.name.trim()) return;
    setIsSubmitting(true);

    try {
      if (formMode === 'create') {
        const input: any = {
          projectId,
          name: milestoneForm.name,
          status: milestoneForm.status as 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled',
        };
        if (milestoneForm.description) input.description = milestoneForm.description;
        if (milestoneForm.targetDate) input.targetDate = new Date(milestoneForm.targetDate);
        if (milestoneForm.moduleId) input.moduleId = Number(milestoneForm.moduleId);

        await createMutation.mutateAsync(input);

        toast({
          title: 'Meilenstein erstellt',
          description: `"${milestoneForm.name}" wurde erstellt.`,
        });
      } else if (milestoneForm.id) {
        const input: any = {
          id: milestoneForm.id,
          name: milestoneForm.name,
          status: milestoneForm.status as 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled',
        };
        if (milestoneForm.description !== undefined) input.description = milestoneForm.description;
        if (milestoneForm.targetDate) {
          input.targetDate = new Date(milestoneForm.targetDate);
        } else {
          input.targetDate = null;
        }
        if (milestoneForm.moduleId) {
          input.moduleId = Number(milestoneForm.moduleId);
        } else {
          input.moduleId = null;
        }

        await updateMutation.mutateAsync(input);

        toast({
          title: 'Meilenstein aktualisiert',
          description: 'Der Meilenstein wurde gespeichert.',
        });
      }

      setFormOpen(false);
      setMilestoneForm(defaultForm);
      utils.milestones.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast({
        title: 'Fehler',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting || !deleteId) return;
    setIsDeleting(true);

    try {
      await deleteMutation.mutateAsync({ id: deleteId });

      toast({
        title: 'Meilenstein geloescht',
        description: 'Der Meilenstein wurde geloescht.',
      });

      setDeleteOpen(false);
      setDeleteId(null);
      utils.milestones.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast({
        title: 'Fehler beim Loeschen',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const milestoneItems = milestones ?? [];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {milestoneItems.length} Meilensteine
          </span>
        </div>
        <Button onClick={handleCreateOpen}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Meilenstein
        </Button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 pl-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-24 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-destructive">Fehler: {error.message}</p>
        </div>
      ) : (
        <>
          {/* Timeline view */}
          <div className="relative">
            {milestoneItems.length > 0 && (
              <div className="absolute left-6 top-0 h-full w-0.5 bg-border" />
            )}

            <div className="space-y-4">
              {milestoneItems.map((milestone) => (
                <div key={milestone.id} className="relative flex gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-1 shrink-0">
                    {getStatusIcon(milestone.status)}
                  </div>

                  {/* Content card */}
                  <Card className="flex-1">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">
                              {milestone.name}
                            </h3>
                            <Badge
                              className={`text-[10px] ${getStatusColor(milestone.status)}`}
                            >
                              {getStatusLabel(milestone.status)}
                            </Badge>
                          </div>
                          {milestone.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {milestone.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {milestone.targetDate && (
                              <div className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span>{formatDate(milestone.targetDate)}</span>
                              </div>
                            )}
                            {milestone.moduleName && (
                              <div className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                <span>{milestone.moduleName}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <span>
                                {milestone.tasksCompleted}/{milestone.taskCount} Aufgaben
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEditOpen(milestone)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteId(milestone.id);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {milestoneItems.length === 0 && (
              <div className="py-12 text-center">
                <Milestone className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Keine Meilensteine gefunden
                </p>
                <Button onClick={handleCreateOpen} variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Ersten Meilenstein erstellen
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Neuen Meilenstein erstellen' : 'Meilenstein bearbeiten'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Definieren Sie einen neuen Meilenstein fuer das Projekt'
                : 'Bearbeiten Sie den Meilenstein'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="ms-name">Bezeichnung *</Label>
              <Input
                id="ms-name"
                placeholder="z.B. Baugenehmigung erteilt"
                value={milestoneForm.name}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ms-description">Beschreibung</Label>
              <Textarea
                id="ms-description"
                placeholder="Optionale Beschreibung..."
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ms-date">Zieldatum</Label>
                <Input
                  id="ms-date"
                  type="date"
                  value={milestoneForm.targetDate}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={milestoneForm.status}
                  onValueChange={(value) => setMilestoneForm({ ...milestoneForm, status: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {modulesData && modulesData.length > 0 && (
              <div>
                <Label>Modul</Label>
                <Select
                  value={milestoneForm.moduleId}
                  onValueChange={(value) => setMilestoneForm({ ...milestoneForm, moduleId: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Modul waehlen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kein Modul</SelectItem>
                    {modulesData.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.hoaiPhase ? `LP ${m.hoaiPhase} - ` : ''}{m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button onClick={handleFormSubmit} disabled={!milestoneForm.name.trim() || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {formMode === 'create' ? 'Erstellen' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meilenstein loeschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diesen Meilenstein loeschen moechten?
              Diese Aktion kann nicht rueckgaengig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {isDeleting ? 'Wird geloescht...' : 'Loeschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
