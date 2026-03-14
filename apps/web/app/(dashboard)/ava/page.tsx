'use client';

import { trpc } from '@/lib/trpc';
import {
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
import { Clipboard, Download, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Veroeffentlicht',
  published: 'Veroeffentlicht',
  bidding: 'Bieterphase',
  evaluation: 'Auswertung',
  awarded: 'Vergeben',
  executed: 'Ausgefuehrt',
  cancelled: 'Storniert',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'sent':
    case 'published':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'bidding':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
    case 'evaluation':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'awarded':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'executed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getVergabeartColor(art: string | undefined): string {
  switch (art) {
    case 'offen':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'beschraenkt':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
    case 'freihaendig':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

const vergabeartLabels: Record<string, string> = {
  offen: 'Offenes Verfahren',
  beschraenkt: 'Beschraenkte Ausschreibung',
  freihaendig: 'Freihaendige Vergabe',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function AVAPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Map display labels to API status values.
  // 'Veroeffentlicht' maps to 'sent' because the send mutation stores 'sent' in the DB.
  const statusMap: Record<string, string> = {
    Entwurf: 'draft',
    Veroeffentlicht: 'sent',
    Bieterphase: 'bidding',
    Auswertung: 'evaluation',
    Vergeben: 'awarded',
    Ausgefuehrt: 'executed',
  };

  const { data, isLoading, error } = trpc.procurement.list.useQuery({
    type: 'ava_tender',
    search: searchQuery || undefined,
    status:
      filterStatus !== 'all'
        ? (statusMap[filterStatus] as
            | 'draft'
            | 'sent'
            | 'bidding'
            | 'evaluation'
            | 'awarded'
            | 'executed')
        : undefined,
    page: 1,
    pageSize: 50,
  });

  const items = data?.items ?? [];
  const draftCount = items.filter((o) => o.status === 'draft').length;
  const publishedCount = items.filter(
    (o) => o.status === 'published' || o.status === 'sent' || o.status === 'bidding',
  ).length;
  const awardedCount = items.filter((o) => o.status === 'awarded').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AVA</h1>
          <p className="text-muted-foreground">Ausschreibung, Vergabe und Abrechnung verwalten</p>
        </div>
        <Button asChild>
          <Link href="/ava/new">
            <Plus className="h-4 w-4" />
            Neue Ausschreibung
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Ausschreibungen gesamt</p>
          <p className="text-2xl font-bold">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Entwuerfe</p>
          <p className="text-2xl font-bold text-gray-600">{draftCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Laufend</p>
          <p className="text-2xl font-bold text-blue-600">{publishedCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Vergeben</p>
          <p className="text-2xl font-bold text-green-600">{awardedCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ausschreibungen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="Entwurf">Entwurf</SelectItem>
            <SelectItem value="Veroeffentlicht">Veroeffentlicht</SelectItem>
            <SelectItem value="Bieterphase">Bieterphase</SelectItem>
            <SelectItem value="Auswertung">Auswertung</SelectItem>
            <SelectItem value="Vergeben">Vergeben</SelectItem>
            <SelectItem value="Ausgefuehrt">Ausgefuehrt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="divide-y p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
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
                  <TableHead className="px-4">Vergabeart</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4 text-right">Schaetzsumme</TableHead>
                  <TableHead className="px-4">Positionen</TableHead>
                  <TableHead className="px-4">Bieter</TableHead>
                  <TableHead className="px-4 w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const avaParams = item.avaParams as { vergabeart?: string } | null | undefined;
                  const vergabeart = avaParams?.vergabeart;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="px-4 font-mono text-sm">
                        <Link href={`/ava/${item.id}`} className="hover:underline font-medium">
                          {item.number ?? `#${item.id}`}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {item.projectName}
                      </TableCell>
                      <TableCell className="px-4">
                        <Link
                          href={`/ava/${item.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Clipboard className="h-4 w-4 text-muted-foreground" />
                          {item.title}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4">
                        {vergabeart && (
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getVergabeartColor(vergabeart)}`}
                          >
                            {vergabeartLabels[vergabeart] ?? vergabeart}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}
                        >
                          {statusApiToDisplay[item.status ?? 'draft'] ?? item.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 text-right font-medium">
                        {item.totalValueNet
                          ? formatCurrency(Number.parseFloat(item.totalValueNet))
                          : '---'}
                      </TableCell>
                      <TableCell className="px-4 text-center">{item.positionCount ?? 0}</TableCell>
                      <TableCell className="px-4 text-center">{item.bidCount ?? 0}</TableCell>
                      <TableCell className="px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/ava/${item.id}`}>Bearbeiten</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              PDF exportieren
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Loeschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {items.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Clipboard className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">Keine Ausschreibungen gefunden</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/ava/new">
                    <Plus className="h-4 w-4" />
                    Erste Ausschreibung erstellen
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
