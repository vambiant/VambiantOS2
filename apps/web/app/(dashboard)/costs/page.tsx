'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'Freigegeben':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'In Bearbeitung':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Entwurf':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'Abgeschlossen':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'Kostenschätzung':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    case 'Kostenberechnung':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Kostenanschlag':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'Kostenfeststellung':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const typeApiToDisplay: Record<string, string> = {
  kostenschaetzung: 'Kostenschätzung',
  kostenberechnung: 'Kostenberechnung',
  kostenanschlag: 'Kostenanschlag',
  kostenfeststellung: 'Kostenfeststellung',
};

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  active: 'In Bearbeitung',
  approved: 'Freigegeben',
  archived: 'Abgeschlossen',
};

export default function CostsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Fetch projects to allow selection
  const { data: projectsData } = trpc.projects.list.useQuery({ page: 1, pageSize: 100 });
  const projects = projectsData?.items ?? [];

  // Fetch cost estimations for selected project
  const { data: estimationsData, isLoading } = trpc.finance.costEstimations.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: selectedProjectId !== null },
  );

  const estimations = estimationsData ?? [];

  const filteredEstimations = estimations.filter((item) => {
    const displayType = typeApiToDisplay[item.estimationType] ?? item.estimationType;
    const displayStatus = statusApiToDisplay[item.status ?? "draft"] ?? item.status;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || displayType === filterType;
    const matchesStatus = filterStatus === 'all' || displayStatus === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalSum = filteredEstimations.reduce((sum, item) => sum + parseFloat(item.totalNet ?? '0'), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kostenplanung</h1>
          <p className="text-muted-foreground">
            Kostenschätzungen, -berechnungen, -anschläge und -feststellungen nach DIN 276
          </p>
        </div>
        <Button asChild>
          <Link href="/costs/new">
            <Plus className="h-4 w-4" />
            Neue Kostenschätzung
          </Link>
        </Button>
      </div>

      {/* Project selector */}
      <div className="flex items-center gap-3">
        <Select
          value={selectedProjectId ? String(selectedProjectId) : ''}
          onValueChange={(v) => setSelectedProjectId(v ? Number(v) : null)}
        >
          <SelectTrigger className="w-[350px]">
            <SelectValue placeholder="Projekt auswählen..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Gesamt</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSum)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Schätzungen</p>
          <p className="text-2xl font-bold">
            {estimations.filter((e) => e.estimationType === 'kostenschaetzung').length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">In Bearbeitung</p>
          <p className="text-2xl font-bold">
            {estimations.filter((e) => e.status === 'active').length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Freigegeben</p>
          <p className="text-2xl font-bold">
            {estimations.filter((e) => e.status === 'approved').length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kostenschätzungen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Typ filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="Kostenschätzung">Kostenschätzung</SelectItem>
            <SelectItem value="Kostenberechnung">Kostenberechnung</SelectItem>
            <SelectItem value="Kostenanschlag">Kostenanschlag</SelectItem>
            <SelectItem value="Kostenfeststellung">Kostenfeststellung</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="Entwurf">Entwurf</SelectItem>
            <SelectItem value="In Bearbeitung">In Bearbeitung</SelectItem>
            <SelectItem value="Freigegeben">Freigegeben</SelectItem>
            <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="px-4">Name</TableHead>
              <TableHead className="px-4">Projekt</TableHead>
              <TableHead className="px-4">Typ</TableHead>
              <TableHead className="px-4 text-right">Summe</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Datum</TableHead>
              <TableHead className="px-4 w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Wird geladen...
                </TableCell>
              </TableRow>
            ) : !selectedProjectId ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Bitte wählen Sie ein Projekt aus
                </TableCell>
              </TableRow>
            ) : (
              filteredEstimations.map((item) => {
                const displayType = typeApiToDisplay[item.estimationType] ?? item.estimationType;
                const displayStatus = statusApiToDisplay[item.status ?? "draft"] ?? item.status;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="px-4 font-medium">
                      <Link
                        href={`/costs/${item.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {projects.find((p) => p.id === selectedProjectId)?.name ?? '---'}
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getTypeColor(displayType)}`}
                      >
                        {displayType}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-right font-medium">
                      {item.totalNet ? formatCurrency(parseFloat(item.totalNet)) : '---'}
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(displayStatus)}`}
                      >
                        {displayStatus}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString('de-DE')}
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
                            <Link href={`/costs/${item.id}`}>Bearbeiten</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            PDF exportieren
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Excel exportieren
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {filteredEstimations.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Calculator className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Keine Kostenschätzungen gefunden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
