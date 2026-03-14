'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
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
  Label,
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
  sent: 'Gesendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
  partially_paid: 'Teilweise bezahlt',
};

const statusDisplayToApi: Record<string, string> = {
  Entwurf: 'draft',
  Gesendet: 'sent',
  Bezahlt: 'paid',
  'Überfällig': 'overdue',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'paid':
    case 'Bezahlt':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'sent':
    case 'Gesendet':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'draft':
    case 'Entwurf':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'overdue':
    case 'Überfällig':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'cancelled':
    case 'Storniert':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    case 'partially_paid':
    case 'Teilweise bezahlt':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function InvoicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);
  const [markPaidAmount, setMarkPaidAmount] = useState('');
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split('T')[0] ?? '');

  const deleteMutation = trpc.finance.invoices.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Rechnung gelöscht', description: 'Die Rechnung wurde erfolgreich gelöscht.' });
      setDeleteId(null);
      utils.finance.invoices.list.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const sendMutation = trpc.finance.invoices.send.useMutation({
    onSuccess: () => {
      toast({ title: 'Rechnung versendet', description: 'Status wurde auf "Gesendet" geändert.' });
      utils.finance.invoices.list.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const markPaidMutation = trpc.finance.invoices.markPaid.useMutation({
    onSuccess: () => {
      toast({ title: 'Zahlung erfasst', description: 'Die Rechnung wurde als bezahlt markiert.' });
      setMarkPaidId(null);
      utils.finance.invoices.list.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const apiStatus = filterStatus !== 'all' ? (statusDisplayToApi[filterStatus] as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid' | undefined) : undefined;

  const { data, isLoading, error } = trpc.finance.invoices.list.useQuery({
    status: apiStatus,
    page: 1,
    pageSize: 50,
  });

  const allInvoices = data?.items ?? [];

  // Client-side search filter
  const filteredInvoices = allInvoices.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.invoiceNumber ?? '').toLowerCase().includes(q) ||
      (item.organizationName ?? '').toLowerCase().includes(q) ||
      (item.projectName ?? '').toLowerCase().includes(q)
    );
  });

  const totalOpen = allInvoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + parseFloat(i.amountGross ?? '0'), 0);
  const totalPaid = allInvoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + parseFloat(i.amountGross ?? '0'), 0);
  const totalOverdue = allInvoices
    .filter((i) => i.status === 'overdue')
    .reduce((s, i) => s + parseFloat(i.amountGross ?? '0'), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rechnungen</h1>
          <p className="text-muted-foreground">
            Ausgangsrechnungen erstellen und verwalten
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            Neue Rechnung
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Rechnungen gesamt</p>
          <p className="text-2xl font-bold">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Offene Forderungen</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(totalOpen)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Bezahlt (2026)</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              Überfällig
            </span>
          </p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(totalOverdue)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechnungen suchen..."
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
            <SelectItem value="Gesendet">Gesendet</SelectItem>
            <SelectItem value="Bezahlt">Bezahlt</SelectItem>
            <SelectItem value="Überfällig">Überfällig</SelectItem>
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
              <TableHead className="px-4">Empfänger</TableHead>
              <TableHead className="px-4 text-right">Betrag (brutto)</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Fällig</TableHead>
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
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-8 text-center text-sm text-destructive">
                  Fehler: {error.message}
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((item) => {
                const displayStatus = statusApiToDisplay[item.status ?? 'draft'] ?? item.status ?? 'Entwurf';
                return (
                  <TableRow key={item.id}>
                    <TableCell className="px-4 font-mono text-sm">
                      <Link
                        href={`/invoices/${item.id}`}
                        className="hover:underline font-medium"
                      >
                        {item.invoiceNumber ?? `#${item.id}`}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground text-sm">
                      {item.projectName ?? '---'}
                    </TableCell>
                    <TableCell className="px-4">{item.organizationName ?? '---'}</TableCell>
                    <TableCell className="px-4 text-right font-medium">
                      {item.amountGross ? formatCurrency(parseFloat(item.amountGross)) : '---'}
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}
                      >
                        {item.status === 'overdue' && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {displayStatus}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {formatDate(item.dueDate ?? '')}
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
                            <Link href={`/invoices/${item.id}`}>Anzeigen</Link>
                          </DropdownMenuItem>
                          {item.status === 'draft' && (
                            <DropdownMenuItem onClick={() => sendMutation.mutate({ id: item.id })}>
                              Als gesendet markieren
                            </DropdownMenuItem>
                          )}
                          {(item.status === 'sent' || item.status === 'overdue') && (
                            <DropdownMenuItem onClick={() => {
                              setMarkPaidId(item.id);
                              setMarkPaidAmount(item.amountGross ?? '0');
                              setMarkPaidDate(new Date().toISOString().split('T')[0] ?? '');
                            }}>
                              Als bezahlt markieren
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(item.id)}>
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

        {!isLoading && !error && filteredInvoices.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Keine Rechnungen gefunden
            </p>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechnung löschen?</DialogTitle>
            <DialogDescription>
              Möchten Sie diese Rechnung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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

      {/* Mark Paid dialog */}
      <Dialog open={markPaidId !== null} onOpenChange={(open) => { if (!open) setMarkPaidId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zahlung erfassen</DialogTitle>
            <DialogDescription>
              Geben Sie den bezahlten Betrag und das Zahlungsdatum an.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bezahlter Betrag</Label>
              <Input type="number" step="0.01" value={markPaidAmount} onChange={(e) => setMarkPaidAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Zahlungsdatum</Label>
              <Input type="date" value={markPaidDate} onChange={(e) => setMarkPaidDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidId(null)}>Abbrechen</Button>
            <Button onClick={() => {
              if (markPaidId && markPaidAmount && markPaidDate) {
                markPaidMutation.mutate({
                  id: markPaidId,
                  paidAmount: parseFloat(markPaidAmount),
                  paidAt: new Date(markPaidDate),
                });
              }
            }} disabled={markPaidMutation.isPending}>
              {markPaidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Zahlung erfassen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
