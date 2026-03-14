'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'archived':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusDisplay(status: string | null | undefined): string {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'completed': return 'Abgeschlossen';
    case 'draft': return 'Entwurf';
    case 'archived': return 'Archiviert';
    default: return status ?? '---';
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

export default function QuestionnairesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: questionnairesData, isLoading } = trpc.questionnaires.list.useQuery({
    page: 1,
    pageSize: 50,
    status: filterStatus !== 'all' ? (filterStatus as 'draft' | 'active' | 'completed' | 'archived') : undefined,
    search: searchQuery || undefined,
  });

  const questionnaires = questionnairesData?.items ?? [];

  // Count by status from loaded data
  const activeCount = questionnaires.filter((q) => q.status === 'active').length;
  const completedCount = questionnaires.filter((q) => q.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fragebögen</h1>
          <p className="text-muted-foreground">
            Bedarfsermittlung und Nutzerbefragungen für Projekte
          </p>
        </div>
        <Button asChild>
          <Link href="/questionnaires/new">
            <Plus className="h-4 w-4" />
            Neuer Fragebogen
          </Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Fragebögen gesamt</p>
          <p className="text-2xl font-bold">{questionnairesData?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Aktiv</p>
          <p className="text-2xl font-bold text-blue-600">
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Abgeschlossen</p>
          <p className="text-2xl font-bold text-green-600">
            {completedCount}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Fragebögen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
            <SelectItem value="archived">Archiviert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="px-4">Name</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Abschnitte</TableHead>
              <TableHead className="px-4">Erstellt</TableHead>
              <TableHead className="px-4 w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Wird geladen...
                </TableCell>
              </TableRow>
            ) : questionnaires.map((item) => {
              const sections = Array.isArray(item.sections) ? (item.sections as unknown[]) : [];
              return (
                <TableRow key={item.id}>
                  <TableCell className="px-4">
                    <Link
                      href={`/questionnaires/${item.id}`}
                      className="flex items-center gap-2 hover:underline font-medium"
                    >
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      {item.title}
                    </Link>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                        {item.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}
                    >
                      {getStatusDisplay(item.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    <span className="text-xs text-muted-foreground">
                      {sections.length} Abschnitte
                    </span>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell className="px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/questionnaires/${item.id}`}>
                            Öffnen
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                        <DropdownMenuItem>Duplizieren</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {!isLoading && questionnaires.length === 0 && (
          <div className="px-6 py-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Keine Fragebögen gefunden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
