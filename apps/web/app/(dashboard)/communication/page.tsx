'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Mail,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTypeDisplay(type: string | null | undefined): string {
  switch (type) {
    case 'meeting_protocol': return 'Projektbesprechung';
    case 'correspondence': return 'Schriftverkehr';
    case 'note': return 'Notiz';
    default: return type ?? '---';
  }
}

export default function CommunicationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('protokolle');

  const { data: protocolsData, isLoading: protocolsLoading } = trpc.communication.list.useQuery({
    page: 1,
    pageSize: 50,
    type: 'meeting_protocol',
    search: searchQuery || undefined,
  });

  const { data: correspondenceData, isLoading: correspondenceLoading } = trpc.communication.list.useQuery({
    page: 1,
    pageSize: 50,
    type: 'correspondence',
    search: searchQuery || undefined,
  });

  const protocols = protocolsData?.items ?? [];
  const correspondence = correspondenceData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kommunikation</h1>
          <p className="text-muted-foreground">
            Besprechungsprotokolle und Schriftverkehr verwalten
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="protokolle">
            Besprechungsprotokolle ({protocolsData?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="schriftverkehr">
            Schriftverkehr ({correspondenceData?.total ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Protokolle Tab */}
        <TabsContent value="protokolle">
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/communication/new">
                <Plus className="h-4 w-4" />
                Neues Protokoll
              </Link>
            </Button>
          </div>
          <div className="rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-4">Datum</TableHead>
                  <TableHead className="px-4">Betreff</TableHead>
                  <TableHead className="px-4">Projekt</TableHead>
                  <TableHead className="px-4">Typ</TableHead>
                  <TableHead className="px-4">Ersteller</TableHead>
                  <TableHead className="px-4 w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocolsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Wird geladen...
                    </TableCell>
                  </TableRow>
                ) : protocols.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell className="px-4">
                      <Link
                        href={`/communication/${item.id}`}
                        className="flex items-center gap-2 hover:underline font-medium"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {item.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground text-sm">
                      {item.projectName ?? '---'}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                        {item.entryType ?? getTypeDisplay(item.type)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground text-sm">
                      {item.creatorName ?? '---'}
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
                            <Link href={`/communication/${item.id}`}>
                              Anzeigen
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>PDF exportieren</DropdownMenuItem>
                          <DropdownMenuItem>Per E-Mail senden</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!protocolsLoading && protocols.length === 0 && (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Keine Protokolle gefunden
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Schriftverkehr Tab */}
        <TabsContent value="schriftverkehr">
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/communication/new">
                <Plus className="h-4 w-4" />
                Neuer Eintrag
              </Link>
            </Button>
          </div>
          <div className="rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-4">Datum</TableHead>
                  <TableHead className="px-4">Betreff</TableHead>
                  <TableHead className="px-4">Projekt</TableHead>
                  <TableHead className="px-4">Typ</TableHead>
                  <TableHead className="px-4">Ersteller</TableHead>
                  <TableHead className="px-4 w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {correspondenceLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Wird geladen...
                    </TableCell>
                  </TableRow>
                ) : correspondence.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell className="px-4">
                      <Link
                        href={`/communication/${item.id}`}
                        className="flex items-center gap-2 hover:underline font-medium"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {item.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground text-sm">
                      {item.projectName ?? '---'}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        {item.entryType ?? getTypeDisplay(item.type)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground text-sm">
                      {item.creatorName ?? '---'}
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
                            <Link href={`/communication/${item.id}`}>
                              Anzeigen
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>PDF exportieren</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!correspondenceLoading && correspondence.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Kein Schriftverkehr gefunden
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
