'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  expired: 'Abgelaufen',
  published: 'Veröffentlicht',
  bidding: 'Bieterphase',
  evaluation: 'Auswertung',
  awarded: 'Vergeben',
  executed: 'Ausgeführt',
  cancelled: 'Storniert',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'accepted':
    case 'Angenommen':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'sent':
    case 'Gesendet':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'draft':
    case 'Entwurf':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'rejected':
    case 'Abgelehnt':
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

export default function HoaiPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const statusMap: Record<string, string> = {
    Entwurf: 'draft',
    Gesendet: 'sent',
    Angenommen: 'accepted',
    Abgelehnt: 'rejected',
  };

  const { data, isLoading, error } = trpc.procurement.list.useQuery({
    type: 'hoai_offer',
    search: searchQuery || undefined,
    status: filterStatus !== 'all' ? (statusMap[filterStatus] as 'draft' | 'sent' | 'accepted' | 'rejected') : undefined,
    page: 1,
    pageSize: 50,
  });

  const items = data?.items ?? [];
  const totalFee = items.reduce((sum, item) => sum + parseFloat(item.totalValueNet ?? '0'), 0);
  const acceptedCount = items.filter((o) => o.status === 'accepted').length;
  const acceptedFee = items.filter((o) => o.status === 'accepted').reduce((sum, item) => sum + parseFloat(item.totalValueNet ?? '0'), 0);
  const sentCount = items.filter((o) => o.status === 'sent').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HOAI Honorarangebote</h1>
          <p className="text-muted-foreground">
            Honorarberechnungen und Angebote nach der HOAI verwalten
          </p>
        </div>
        <Button asChild>
          <Link href="/hoai/new">
            <Plus className="h-4 w-4" />
            Neues Angebot
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Angebote gesamt</p>
          <p className="text-2xl font-bold">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Angenommen</p>
          <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Honorarsumme (angenommen)</p>
          <p className="text-2xl font-bold">{formatCurrency(acceptedFee)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Offene Angebote</p>
          <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Angebote suchen..."
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
            <SelectItem value="Angenommen">Angenommen</SelectItem>
            <SelectItem value="Abgelehnt">Abgelehnt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="divide-y p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center text-sm text-destructive">
            Fehler beim Laden: {error.message}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-4">Nr</TableHead>
                  <TableHead className="px-4">Projekt</TableHead>
                  <TableHead className="px-4">Titel</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4 text-right">Honorar</TableHead>
                  <TableHead className="px-4">Datum</TableHead>
                  <TableHead className="px-4 w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-4 font-mono text-sm">
                      <Link
                        href={`/hoai/${item.id}`}
                        className="hover:underline font-medium"
                      >
                        {item.number ?? `#${item.id}`}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {item.projectName}
                    </TableCell>
                    <TableCell className="px-4">
                      <Link
                        href={`/hoai/${item.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        {item.title}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}
                      >
                        {statusApiToDisplay[item.status ?? "draft"] ?? item.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-right font-medium">
                      {item.totalValueNet ? formatCurrency(parseFloat(item.totalValueNet)) : '---'}
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
                            <Link href={`/hoai/${item.id}`}>Bearbeiten</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplizieren
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            PDF exportieren
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {items.length === 0 && (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Keine Honorarangebote gefunden
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
