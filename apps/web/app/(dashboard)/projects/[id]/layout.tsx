'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import {
  Activity,
  CheckSquare,
  Edit3,
  FileText,
  FolderOpen,
  GanttChart,
  Kanban,
  LayoutGrid,
  Loader2,
  Milestone,
  MoreHorizontal,
  Package,
  Settings,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  cn,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@vambiant/ui';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const tabs = [
  { label: 'Uebersicht', href: '', icon: LayoutGrid },
  { label: 'Aufgaben', href: '/tasks', icon: CheckSquare },
  { label: 'Module', href: '/modules', icon: Package },
  { label: 'Gantt', href: '/gantt', icon: GanttChart },
  { label: 'Kanban', href: '/kanban', icon: Kanban },
  { label: 'Meilensteine', href: '/milestones', icon: Milestone },
  { label: 'Ergebnisse', href: '/deliverables', icon: FileText },
  { label: 'Dateien', href: '/files', icon: FolderOpen },
  { label: 'Aktivitaet', href: '/activity', icon: Activity },
  { label: 'Einstellungen', href: '/settings', icon: Settings },
];

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'draft':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'completed':
    case 'archived':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'draft': return 'Planung';
    case 'completed': return 'Abgeschlossen';
    case 'on_hold': return 'Pausiert';
    case 'archived': return 'Archiviert';
    case 'cancelled': return 'Storniert';
    default: return status ?? 'Unbekannt';
  }
}

export default function ProjectDetailLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const numericId = Number(projectId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: project, isLoading, error } = trpc.projects.getById.useQuery(
    { id: numericId },
    { enabled: !isNaN(numericId) && numericId > 0 },
  );

  const utils = trpc.useUtils();
  const updateMutation = trpc.projects.update.useMutation();
  const deleteMutation = trpc.projects.delete.useMutation();

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    description: '',
    status: '',
    buildingType: '',
    startDate: '',
    endDate: '',
    budgetNet: '',
    estimatedHours: '',
  });

  const handleEditOpen = () => {
    if (project) {
      setEditForm({
        name: project.name || '',
        code: project.code || '',
        description: project.description || '',
        status: project.status || 'draft',
        buildingType: project.buildingType || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        budgetNet: project.budgetNet || '',
        estimatedHours: project.estimatedHours || '',
      });
      setEditOpen(true);
    }
  };

  const handleEditSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const input: Parameters<typeof updateMutation.mutateAsync>[0] = {
        id: numericId,
      };

      if (editForm.name && editForm.name !== project?.name) input.name = editForm.name;
      if (editForm.code !== (project?.code || '')) input.code = editForm.code || undefined;
      if (editForm.description !== (project?.description || '')) input.description = editForm.description;
      if (editForm.status && editForm.status !== project?.status) {
        input.status = editForm.status as 'draft' | 'active' | 'on_hold' | 'completed' | 'archived' | 'cancelled';
      }
      if (editForm.buildingType !== (project?.buildingType || '')) input.buildingType = editForm.buildingType || undefined;
      if (editForm.startDate !== (project?.startDate || '')) {
        input.startDate = editForm.startDate ? new Date(editForm.startDate) : null;
      }
      if (editForm.endDate !== (project?.endDate || '')) {
        input.endDate = editForm.endDate ? new Date(editForm.endDate) : null;
      }
      if (editForm.budgetNet !== (project?.budgetNet || '')) {
        const parsed = parseFloat(editForm.budgetNet.replace(',', '.'));
        input.budgetNet = isNaN(parsed) ? null : parsed;
      }
      if (editForm.estimatedHours !== (project?.estimatedHours || '')) {
        const parsed = parseFloat(editForm.estimatedHours);
        input.estimatedHours = isNaN(parsed) ? null : parsed;
      }

      await updateMutation.mutateAsync(input);

      toast({
        title: 'Projekt aktualisiert',
        description: 'Die Projektdaten wurden gespeichert.',
      });

      setEditOpen(false);
      utils.projects.getById.invalidate({ id: numericId });
      utils.projects.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast({
        title: 'Fehler beim Speichern',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      await deleteMutation.mutateAsync({ id: numericId });

      toast({
        title: 'Projekt geloescht',
        description: 'Das Projekt wurde erfolgreich geloescht.',
      });

      setDeleteOpen(false);
      utils.projects.list.invalidate();
      router.push('/projects');
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

  const basePath = `/projects/${projectId}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-destructive">
          Fehler: {error.message}
        </p>
      </div>
    );
  }

  const projectName = project?.name ?? 'Projekt';
  const projectStatus = project?.status ?? 'draft';
  const projectCode = project?.code ?? '';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground transition-colors">
          Projekte
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{projectName}</span>
      </nav>

      {/* Project header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{projectName}</h1>
            <Badge className={getStatusColor(projectStatus)}>
              {getStatusLabel(projectStatus)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {projectCode && <span>{projectCode}</span>}
            {project?.buildingType && (
              <>
                {projectCode && <span>&middot;</span>}
                <span>{project.buildingType}</span>
              </>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditOpen}>
              <Edit3 className="mr-2 h-4 w-4" />
              Projekt bearbeiten
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Projekt loeschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tab navigation */}
      <div className="border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const tabPath = `${basePath}${tab.href}`;
            const isActive =
              tab.href === ''
                ? pathname === basePath
                : pathname.startsWith(tabPath);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tabPath}
                className={cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>{children}</div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Projekt bearbeiten</DialogTitle>
            <DialogDescription>
              Aendern Sie die Projektdaten
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="edit-name">Projektname *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="edit-code">Projektnummer</Label>
                <Input
                  id="edit-code"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Planung</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="on_hold">Pausiert</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="archived">Archiviert</SelectItem>
                    <SelectItem value="cancelled">Storniert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="edit-description">Beschreibung</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-startDate">Startdatum</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="edit-endDate">Enddatum</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="edit-budgetNet">Honorar (netto)</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="edit-budgetNet"
                    type="text"
                    value={editForm.budgetNet}
                    onChange={(e) => setEditForm({ ...editForm, budgetNet: e.target.value })}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    EUR
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-hours">Geschaetzte Stunden</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="edit-hours"
                    type="number"
                    value={editForm.estimatedHours}
                    onChange={(e) => setEditForm({ ...editForm, estimatedHours: e.target.value })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    h
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button onClick={handleEditSave} disabled={!editForm.name.trim() || isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSaving ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projekt loeschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie das Projekt &quot;{projectName}&quot; loeschen moechten?
              Diese Aktion kann nicht rueckgaengig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
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
