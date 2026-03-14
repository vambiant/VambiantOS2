'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ChevronDown,
  Edit3,
  ListTodo,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@vambiant/ui';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'open':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'review':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'done':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'blocked':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'cancelled':
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-500';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'open': return 'Offen';
    case 'in_progress': return 'In Bearbeitung';
    case 'review': return 'Review';
    case 'done': return 'Erledigt';
    case 'blocked': return 'Blockiert';
    case 'cancelled': return 'Storniert';
    default: return status ?? 'Unbekannt';
  }
}

function getPriorityIndicator(priority: number | null | undefined) {
  const p = priority ?? 3;
  const colors: Record<number, string> = {
    1: 'bg-gray-400',
    2: 'bg-blue-400',
    3: 'bg-yellow-400',
    4: 'bg-orange-400',
    5: 'bg-red-500',
  };
  const labels: Record<number, string> = {
    1: 'Sehr niedrig',
    2: 'Niedrig',
    3: 'Mittel',
    4: 'Hoch',
    5: 'Kritisch',
  };
  return {
    color: colors[p] || 'bg-gray-400',
    label: labels[p] || 'Unbekannt',
  };
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
  { value: 'open', label: 'Offen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Erledigt' },
  { value: 'blocked', label: 'Blockiert' },
  { value: 'cancelled', label: 'Storniert' },
];

const priorityOptions = [
  { value: '1', label: 'Sehr niedrig', color: 'bg-gray-400' },
  { value: '2', label: 'Niedrig', color: 'bg-blue-400' },
  { value: '3', label: 'Mittel', color: 'bg-yellow-400' },
  { value: '4', label: 'Hoch', color: 'bg-orange-400' },
  { value: '5', label: 'Kritisch', color: 'bg-red-500' },
];

interface TaskFormState {
  id?: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimatedHours: string;
  startDate: string;
  dueDate: string;
}

const defaultTaskForm: TaskFormState = {
  title: '',
  description: '',
  status: 'open',
  priority: '3',
  estimatedHours: '',
  startDate: '',
  dueDate: '',
};

export default function TasksPage() {
  const params = useParams();
  const projectId = Number(params.id as string);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Task form state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [taskForm, setTaskForm] = useState<TaskFormState>(defaultTaskForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.tasks.list.useQuery(
    {
      projectId,
      page,
      pageSize: 50,
      search: searchQuery || undefined,
      status: statusFilter !== 'all'
        ? (statusFilter as 'open' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled')
        : undefined,
      sortBy: 'dueDate',
      sortOrder: 'asc',
    },
    { enabled: !isNaN(projectId) && projectId > 0 },
  );

  const createMutation = trpc.tasks.create.useMutation();
  const updateMutation = trpc.tasks.update.useMutation();
  const deleteMutation = trpc.tasks.delete.useMutation();

  const tasks = data?.items ?? [];

  const handleCreateOpen = () => {
    setTaskForm(defaultTaskForm);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEditOpen = (task: (typeof tasks)[number]) => {
    setTaskForm({
      id: task.id,
      title: task.title,
      description: '',
      status: task.status || 'open',
      priority: String(task.priority ?? 3),
      estimatedHours: task.estimatedHours || '',
      startDate: '',
      dueDate: task.dueDate || '',
    });
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (isSubmitting || !taskForm.title.trim()) return;
    setIsSubmitting(true);

    try {
      if (formMode === 'create') {
        const input: any = {
          projectId,
          title: taskForm.title,
          status: taskForm.status as 'open' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled',
          priority: Number(taskForm.priority),
        };

        if (taskForm.description) input.description = taskForm.description;
        if (taskForm.estimatedHours) {
          const parsed = parseFloat(taskForm.estimatedHours);
          if (!isNaN(parsed)) input.estimatedHours = parsed;
        }
        if (taskForm.startDate) input.startDate = new Date(taskForm.startDate);
        if (taskForm.dueDate) input.dueDate = new Date(taskForm.dueDate);

        await createMutation.mutateAsync(input);

        toast({
          title: 'Aufgabe erstellt',
          description: `"${taskForm.title}" wurde erstellt.`,
        });
      } else if (taskForm.id) {
        const input: any = {
          id: taskForm.id,
          title: taskForm.title,
          status: taskForm.status as 'open' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled',
          priority: Number(taskForm.priority),
        };

        if (taskForm.description) input.description = taskForm.description;
        if (taskForm.estimatedHours) {
          const parsed = parseFloat(taskForm.estimatedHours);
          input.estimatedHours = isNaN(parsed) ? null : parsed;
        }
        if (taskForm.dueDate) {
          input.dueDate = new Date(taskForm.dueDate);
        }

        await updateMutation.mutateAsync(input);

        toast({
          title: 'Aufgabe aktualisiert',
          description: 'Die Aufgabe wurde gespeichert.',
        });
      }

      setFormOpen(false);
      setTaskForm(defaultTaskForm);
      utils.tasks.list.invalidate();
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

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: taskId,
        status: newStatus as 'open' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled',
      });
      utils.tasks.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast({
        title: 'Fehler beim Statuswechsel',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting || !deleteTaskId) return;
    setIsDeleting(true);

    try {
      await deleteMutation.mutateAsync({ id: deleteTaskId });

      toast({
        title: 'Aufgabe geloescht',
        description: 'Die Aufgabe wurde geloescht.',
      });

      setDeleteOpen(false);
      setDeleteTaskId(null);
      utils.tasks.list.invalidate();
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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Aufgaben suchen..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-64 pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
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
            {data?.total ?? 0} Aufgaben
          </span>
        </div>
        <Button onClick={handleCreateOpen}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Aufgabe
        </Button>
      </div>

      {/* Task table */}
      {isLoading ? (
        <div className="rounded-xl border bg-card shadow-sm p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-destructive">
            Fehler beim Laden: {error.message}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead className="w-[100px]">Prioritaet</TableHead>
                <TableHead className="w-[160px]">Zugewiesen</TableHead>
                <TableHead className="w-[100px]">Faellig</TableHead>
                <TableHead className="w-[80px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const prio = getPriorityIndicator(task.priority);
                  return (
                    <TableRow
                      key={task.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${getStatusColor(task.status)}`}
                            >
                              {getStatusLabel(task.status)}
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {statusOptions.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                onClick={() => handleStatusChange(task.id, option.value)}
                              >
                                <span
                                  className={`mr-2 inline-block h-2 w-2 rounded-full ${getStatusColor(option.value).split(' ')[0]}`}
                                />
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{task.title}</span>
                        {task.estimatedHours && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {task.estimatedHours} h
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${prio.color}`} />
                          <span className="text-xs">{prio.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.assigneeName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                                {task.assigneeName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Nicht zugewiesen
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span
                            className={`text-xs ${
                              new Date(task.dueDate) < new Date() && task.status !== 'done'
                                ? 'font-medium text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEditOpen(task)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTaskId(task.id);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <ListTodo className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Keine Aufgaben gefunden
                    </p>
                    <Button onClick={handleCreateOpen} variant="outline" className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Erste Aufgabe erstellen
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <p className="text-sm text-muted-foreground">
                {data.total} Aufgaben, Seite {data.page} von {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Zurueck
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Form Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {formMode === 'create' ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}
            </SheetTitle>
            <SheetDescription>
              {formMode === 'create'
                ? 'Erstellen Sie eine neue Aufgabe fuer dieses Projekt'
                : 'Bearbeiten Sie die Aufgabendetails'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div>
              <Label htmlFor="task-title">Titel *</Label>
              <Input
                id="task-title"
                placeholder="Aufgabentitel eingeben..."
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="task-description">Beschreibung</Label>
              <Textarea
                id="task-description"
                placeholder="Beschreibung der Aufgabe..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="mt-1.5"
                rows={4}
              />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
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

              <div>
                <Label>Prioritaet</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${p.color}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="task-hours">Geschaetzte Stunden</Label>
              <Input
                id="task-hours"
                type="number"
                placeholder="0"
                value={taskForm.estimatedHours}
                onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="task-start">Startdatum</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={taskForm.startDate}
                  onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="task-due">Faelligkeitsdatum</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button onClick={handleFormSubmit} disabled={!taskForm.title.trim() || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {formMode === 'create' ? 'Erstellen' : 'Speichern'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufgabe loeschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Aufgabe loeschen moechten?
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
