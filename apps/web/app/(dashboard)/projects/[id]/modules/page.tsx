'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ListTodo,
  Loader2,
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
  Progress,
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

function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'completed': return 'Abgeschlossen';
    case 'active': return 'In Bearbeitung';
    case 'planned': return 'Geplant';
    case 'on_hold': return 'Pausiert';
    case 'cancelled': return 'Storniert';
    default: return status ?? 'Unbekannt';
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const statusOptions = [
  { value: 'planned', label: 'Geplant' },
  { value: 'active', label: 'In Bearbeitung' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'on_hold', label: 'Pausiert' },
  { value: 'cancelled', label: 'Storniert' },
];

const hoaiPhaseOptions = [
  { value: '1', label: 'LP 1 - Grundlagenermittlung' },
  { value: '2', label: 'LP 2 - Vorplanung' },
  { value: '3', label: 'LP 3 - Entwurfsplanung' },
  { value: '4', label: 'LP 4 - Genehmigungsplanung' },
  { value: '5', label: 'LP 5 - Ausfuehrungsplanung' },
  { value: '6', label: 'LP 6 - Vorbereitung der Vergabe' },
  { value: '7', label: 'LP 7 - Mitwirkung bei der Vergabe' },
  { value: '8', label: 'LP 8 - Objektueberwachung' },
  { value: '9', label: 'LP 9 - Objektbetreuung' },
];

interface ModuleFormState {
  id?: number;
  name: string;
  description: string;
  hoaiPhase: string;
  status: string;
  startDate: string;
  endDate: string;
  plannedHours: string;
  budgetNet: string;
}

const defaultForm: ModuleFormState = {
  name: '',
  description: '',
  hoaiPhase: '',
  status: 'planned',
  startDate: '',
  endDate: '',
  plannedHours: '',
  budgetNet: '',
};

export default function ModulesPage() {
  const params = useParams();
  const projectId = Number(params.id as string);
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const utils = trpc.useUtils();

  const { data: modules, isLoading, error } = trpc.modules.list.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) && projectId > 0 },
  );

  const createMutation = trpc.modules.create.useMutation();
  const updateMutation = trpc.modules.update.useMutation();
  const deleteMutation = trpc.modules.delete.useMutation();

  const moduleList = modules ?? [];

  const handleCreateOpen = () => {
    setModuleForm(defaultForm);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEditOpen = (mod: (typeof moduleList)[number]) => {
    setModuleForm({
      id: mod.id,
      name: mod.name,
      description: '',
      hoaiPhase: mod.hoaiPhase ? String(mod.hoaiPhase) : '',
      status: mod.status || 'planned',
      startDate: mod.startDate || '',
      endDate: mod.endDate || '',
      plannedHours: mod.plannedHours || '',
      budgetNet: mod.budgetNet || '',
    });
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (isSubmitting || !moduleForm.name.trim()) return;
    setIsSubmitting(true);

    try {
      if (formMode === 'create') {
        const input: any = {
          projectId,
          name: moduleForm.name,
          status: moduleForm.status as 'planned' | 'active' | 'completed' | 'on_hold' | 'cancelled',
        };

        if (moduleForm.description) input.description = moduleForm.description;
        if (moduleForm.hoaiPhase) input.hoaiPhase = Number(moduleForm.hoaiPhase);
        if (moduleForm.startDate) input.startDate = new Date(moduleForm.startDate);
        if (moduleForm.endDate) input.endDate = new Date(moduleForm.endDate);
        if (moduleForm.plannedHours) {
          const parsed = parseFloat(moduleForm.plannedHours);
          if (!isNaN(parsed)) input.plannedHours = parsed;
        }
        if (moduleForm.budgetNet) {
          const parsed = parseFloat(moduleForm.budgetNet.replace(',', '.'));
          if (!isNaN(parsed)) input.budgetNet = parsed;
        }

        // Set sort order based on hoaiPhase or count
        input.sortOrder = moduleForm.hoaiPhase ? Number(moduleForm.hoaiPhase) : (moduleList.length + 1);

        await createMutation.mutateAsync(input);

        toast({
          title: 'Modul erstellt',
          description: `"${moduleForm.name}" wurde erstellt.`,
        });
      } else if (moduleForm.id) {
        const input: any = {
          id: moduleForm.id,
          name: moduleForm.name,
          status: moduleForm.status as 'planned' | 'active' | 'completed' | 'on_hold' | 'cancelled',
        };

        if (moduleForm.description !== undefined) input.description = moduleForm.description;
        if (moduleForm.hoaiPhase) input.hoaiPhase = Number(moduleForm.hoaiPhase);
        if (moduleForm.startDate) {
          input.startDate = new Date(moduleForm.startDate);
        } else {
          input.startDate = null;
        }
        if (moduleForm.endDate) {
          input.endDate = new Date(moduleForm.endDate);
        } else {
          input.endDate = null;
        }
        if (moduleForm.plannedHours) {
          const parsed = parseFloat(moduleForm.plannedHours);
          input.plannedHours = isNaN(parsed) ? null : parsed;
        } else {
          input.plannedHours = null;
        }
        if (moduleForm.budgetNet) {
          const parsed = parseFloat(moduleForm.budgetNet.replace(',', '.'));
          input.budgetNet = isNaN(parsed) ? null : parsed;
        } else {
          input.budgetNet = null;
        }

        await updateMutation.mutateAsync(input);

        toast({
          title: 'Modul aktualisiert',
          description: 'Das Modul wurde gespeichert.',
        });
      }

      setFormOpen(false);
      setModuleForm(defaultForm);
      utils.modules.list.invalidate();
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
        title: 'Modul geloescht',
        description: 'Das Modul und zugehoerige Aufgaben wurden geloescht.',
      });

      setDeleteOpen(false);
      setDeleteId(null);
      utils.modules.list.invalidate();
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

  const handleStatusChange = async (moduleId: number, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: moduleId,
        status: newStatus as 'planned' | 'active' | 'completed' | 'on_hold' | 'cancelled',
      });
      utils.modules.list.invalidate();
      toast({
        title: 'Status aktualisiert',
        description: `Modul-Status auf "${getStatusLabel(newStatus)}" gesetzt.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast({
        title: 'Fehler beim Statuswechsel',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {isLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {moduleList.length} Module &middot;{' '}
              {moduleList.filter((m) => m.status === 'completed').length}{' '}
              abgeschlossen
            </p>
          )}
        </div>
        <Button onClick={handleCreateOpen}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Modul
        </Button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-2 w-full" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-destructive">Fehler: {error.message}</p>
        </div>
      ) : moduleList.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            Keine Module vorhanden
          </p>
          <Button onClick={handleCreateOpen} variant="outline" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Erstes Modul erstellen
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moduleList.map((module) => {
            const progress = parseFloat(module.progressPercentage || '0');
            const plannedH = module.plannedHours ? parseFloat(module.plannedHours) : 0;

            return (
              <Card key={module.id}>
                <CardContent className="p-5">
                  {/* Card header */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {module.hoaiPhase ? `LP ${module.hoaiPhase} - ` : ''}{module.name}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Select
                          value={module.status || 'planned'}
                          onValueChange={(value) => handleStatusChange(module.id, value)}
                        >
                          <SelectTrigger className="h-6 w-auto border-0 p-0 text-[10px] font-medium shadow-none">
                            <Badge className={`shrink-0 text-[10px] ${getStatusColor(module.status)}`}>
                              {getStatusLabel(module.status)}
                            </Badge>
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEditOpen(module)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(module.id);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fortschritt</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="mt-1.5 h-1.5" />
                  </div>

                  {/* Stats */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-md bg-muted/50 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <ListTodo className="h-3 w-3" />
                        Aufgaben
                      </div>
                      <p className="mt-0.5 text-sm font-semibold">
                        {module.tasksCompleted}/{module.taskCount}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Stunden
                      </div>
                      <p className="mt-0.5 text-sm font-semibold">
                        {plannedH > 0 ? plannedH.toLocaleString('de-DE') : '0'}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        Zeitraum
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium">
                        {module.startDate && module.endDate
                          ? `${formatDate(module.startDate).substring(0, 5)} - ${formatDate(module.endDate).substring(0, 5)}`
                          : '--'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Neues Modul erstellen' : 'Modul bearbeiten'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Erstellen Sie ein neues Modul/Leistungsphase fuer dieses Projekt'
                : 'Bearbeiten Sie die Moduldaten'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="module-name">Name *</Label>
              <Input
                id="module-name"
                placeholder="z.B. Grundlagenermittlung"
                value={moduleForm.name}
                onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="module-description">Beschreibung</Label>
              <Textarea
                id="module-description"
                placeholder="Beschreibung des Moduls..."
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>HOAI-Phase</Label>
                <Select
                  value={moduleForm.hoaiPhase}
                  onValueChange={(value) => setModuleForm({ ...moduleForm, hoaiPhase: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Phase waehlen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine Phase</SelectItem>
                    {hoaiPhaseOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={moduleForm.status}
                  onValueChange={(value) => setModuleForm({ ...moduleForm, status: value })}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="module-start">Startdatum</Label>
                <Input
                  id="module-start"
                  type="date"
                  value={moduleForm.startDate}
                  onChange={(e) => setModuleForm({ ...moduleForm, startDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="module-end">Enddatum</Label>
                <Input
                  id="module-end"
                  type="date"
                  value={moduleForm.endDate}
                  onChange={(e) => setModuleForm({ ...moduleForm, endDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="module-hours">Budgetierte Stunden</Label>
                <Input
                  id="module-hours"
                  type="number"
                  placeholder="0"
                  value={moduleForm.plannedHours}
                  onChange={(e) => setModuleForm({ ...moduleForm, plannedHours: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="module-budget">Budget (netto)</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="module-budget"
                    type="text"
                    placeholder="0,00"
                    value={moduleForm.budgetNet}
                    onChange={(e) => setModuleForm({ ...moduleForm, budgetNet: e.target.value })}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    EUR
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button onClick={handleFormSubmit} disabled={!moduleForm.name.trim() || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {formMode === 'create' ? 'Modul erstellen' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modul loeschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie dieses Modul loeschen moechten?
              Alle zugehoerigen Aufgaben werden ebenfalls geloescht.
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
