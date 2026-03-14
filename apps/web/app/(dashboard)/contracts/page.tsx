'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
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
  useToast,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
  terminated: 'Gekündigt',
  suspended: 'Pausiert',
};

const statusDisplayToApi: Record<string, string> = {
  Entwurf: 'draft',
  Aktiv: 'active',
  Abgeschlossen: 'completed',
  Gekündigt: 'terminated',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'active':
    case 'Aktiv':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'draft':
    case 'Entwurf':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'completed':
    case 'Abgeschlossen':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'terminated':
    case 'Gekündigt':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
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

export default function ContractsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteMutation = trpc.finance.contracts.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Vertrag gelöscht', description: 'Der Vertrag wurde erfolgreich gelöscht.' });
      setDeleteId(null);
      utils.finance.contracts.list.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const apiStatus = filterStatus !== 'all' ? (statusDisplayToApi[filterStatus] as 'draft' | 'active' | 'completed' | 'terminated' | 'suspended' | undefined) : undefined;

  const { data, isLoading, error } = trpc.finance.contracts.list.useQuery({
    status: apiStatus,
    page: 1,
    pageSize: 50,
  });

  const allContracts = data?.items ?? [];

  // Client-side search filter (API doesn't have search param for contracts)
  const filteredContracts = allContracts.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.number ?? '').toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      (item.organizationName ?? '').toLowerCase().includes(q) ||
      item.projectName.toLowerCase().includes(q)
    );
  });

  const totalValue = filteredContracts.reduce((sum, c) => sum + parseFloat(c.totalFeeNet ?? '0'), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verträge</h1>
          <p className="text-muted-foreground">
            Verträge mit Auftragnehmern verwalten
          </p>
        </div>
        <Button asChild>
          <Link href="/contracts/new">
            <Plus className="h-4 w-4" />
            Neuer Vertrag
          </Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Verträge gesamt</p>
          <p className="text-2xl font-bold">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Aktive Verträge</p>
          <p className="text-2xl font-bold text-green-600">
            {allContracts.filter((c) => c.status === 'active').length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Vertragssumme (aktiv)</p>
          <p className="text-2xl font-bold">
            {formatCurrency(
              allContracts
                .filter((c) => c.status === 'active')
                .reduce((s, c) => s + parseFloat(c.totalFeeNet ?? '0'), 0),
            )}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Gesamtvolumen</p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Verträge suchen..."
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
            <SelectItem value="Entwurf">Entwurf</SelectItem>
            <SelectItem value="Aktiv">Aktiv</SelectItem>
            <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
            <SelectItem value="Gekündigt">Gekündigt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="px-4">Nr</TableHead>
              <TableHead className="px-4">Projekt</TableHead>
              <TableHead className="px-4">Titel</TableHead>
              <TableHead className="px-4">Auftragnehmer</TableHead>
              <TableHead className="px-4 text-right">Wert</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Datum</TableHead>
              <TableHead className="px-4 w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Wird geladen...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="px-4 py-8 text-center text-sm text-destructive">
                  Fehler: {error.message}
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 font-mono text-sm">
                    <Link
                      href={`/contracts/${item.id}`}
                      className="hover:underline font-medium"
                    >
                      {item.number ?? `#${item.id}`}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground text-sm">
                    {item.projectName}
                  </TableCell>
                  <TableCell className="px-4">
                    <Link
                      href={`/contracts/${item.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4">{item.organizationName ?? '---'}</TableCell>
                  <TableCell className="px-4 text-right font-medium">
                    {item.totalFeeNet ? formatCurrency(parseFloat(item.totalFeeNet)) : '---'}
                  </TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status ?? 'draft')}`}
                    >
                      {statusApiToDisplay[item.status ?? 'draft'] ?? item.status ?? 'Entwurf'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {item.startDate ? new Date(item.startDate).toLocaleDateString('de-DE') : new Date(item.createdAt).toLocaleDateString('de-DE')}
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
                          <Link href={`/contracts/${item.id}`}>Anzeigen</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/contracts/${item.id}`}>Bearbeiten</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(item.id)}>
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {filteredContracts.length === 0 && (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Keine Verträge gefunden
            </p>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vertrag löschen?</DialogTitle>
            <DialogDescription>
              Möchten Sie diesen Vertrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
