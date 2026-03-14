'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Filter,
  Package,
  Paperclip,
  Search,
  User,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vambiant/ui';

interface Deliverable {
  id: string;
  name: string;
  type: string;
  module: string;
  moduleId: string;
  status: 'entwurf' | 'in_pruefung' | 'genehmigt' | 'abgelehnt' | 'ueberarbeitung';
  dueDate: string;
  approvedBy: string | null;
  hasAttachment: boolean;
  version: string;
}

const mockDeliverables: Deliverable[] = [
  { id: '1', name: 'Bedarfsprogramm', type: 'Bericht', module: 'LP 1', moduleId: 'lp1', status: 'genehmigt', dueDate: '2025-11-01', approvedBy: 'Bauherr AG', hasAttachment: true, version: 'v2.0' },
  { id: '2', name: 'Raumprogramm', type: 'Tabelle', module: 'LP 1', moduleId: 'lp1', status: 'genehmigt', dueDate: '2025-11-10', approvedBy: 'Bauherr AG', hasAttachment: true, version: 'v1.1' },
  { id: '3', name: 'Baugrundgutachten', type: 'Gutachten', module: 'LP 1', moduleId: 'lp1', status: 'genehmigt', dueDate: '2025-11-15', approvedBy: 'Geotechnik GmbH', hasAttachment: true, version: 'v1.0' },
  { id: '4', name: 'Vorentwurf Pläne', type: 'Zeichnung', module: 'LP 2', moduleId: 'lp2', status: 'genehmigt', dueDate: '2025-12-15', approvedBy: 'Bauherr AG', hasAttachment: true, version: 'v3.0' },
  { id: '5', name: 'Kostenschätzung DIN 276', type: 'Berechnung', module: 'LP 2', moduleId: 'lp2', status: 'genehmigt', dueDate: '2025-12-28', approvedBy: 'Bauherr AG', hasAttachment: true, version: 'v2.0' },
  { id: '6', name: 'Vorplanungsbericht', type: 'Bericht', module: 'LP 2', moduleId: 'lp2', status: 'genehmigt', dueDate: '2026-01-10', approvedBy: 'Bauherr AG', hasAttachment: true, version: 'v1.0' },
  { id: '7', name: 'Entwurfsplanung Pläne M 1:100', type: 'Zeichnung', module: 'LP 3', moduleId: 'lp3', status: 'genehmigt', dueDate: '2026-02-01', approvedBy: 'Bauherr AG', hasAttachment: true, version: 'v2.0' },
  { id: '8', name: 'Kostenberechnung DIN 276', type: 'Berechnung', module: 'LP 3', moduleId: 'lp3', status: 'genehmigt', dueDate: '2026-02-15', approvedBy: 'Bauherr AG', hasAttachment: true, version: 'v1.0' },
  { id: '9', name: 'Entwurfsbericht', type: 'Bericht', module: 'LP 3', moduleId: 'lp3', status: 'genehmigt', dueDate: '2026-02-20', approvedBy: 'Bauherr AG', hasAttachment: true, version: 'v1.0' },
  { id: '10', name: 'Bauantragsunterlagen', type: 'Antragsformular', module: 'LP 4', moduleId: 'lp4', status: 'in_pruefung', dueDate: '2026-03-10', approvedBy: null, hasAttachment: true, version: 'v1.0' },
  { id: '11', name: 'Brandschutzkonzept', type: 'Gutachten', module: 'LP 4', moduleId: 'lp4', status: 'ueberarbeitung', dueDate: '2026-03-12', approvedBy: null, hasAttachment: true, version: 'v2.1' },
  { id: '12', name: 'Statische Nachweise', type: 'Berechnung', module: 'LP 4', moduleId: 'lp4', status: 'genehmigt', dueDate: '2026-03-05', approvedBy: 'Prüfstatiker Müller', hasAttachment: true, version: 'v1.0' },
  { id: '13', name: 'Wärmeschutznachweis GEG', type: 'Nachweis', module: 'LP 4', moduleId: 'lp4', status: 'genehmigt', dueDate: '2026-03-08', approvedBy: 'Energieberater Fischer', hasAttachment: true, version: 'v1.0' },
  { id: '14', name: 'Werkpläne Rohbau M 1:50', type: 'Zeichnung', module: 'LP 5', moduleId: 'lp5', status: 'entwurf', dueDate: '2026-04-15', approvedBy: null, hasAttachment: false, version: 'v0.3' },
  { id: '15', name: 'Detailpläne Fassade', type: 'Zeichnung', module: 'LP 5', moduleId: 'lp5', status: 'entwurf', dueDate: '2026-05-01', approvedBy: null, hasAttachment: false, version: 'v0.2' },
  { id: '16', name: 'TGA-Ausführungspläne', type: 'Zeichnung', module: 'LP 5', moduleId: 'lp5', status: 'entwurf', dueDate: '2026-05-15', approvedBy: null, hasAttachment: false, version: 'v0.1' },
  { id: '17', name: 'Leistungsverzeichnis Rohbau', type: 'LV', module: 'LP 6', moduleId: 'lp6', status: 'entwurf', dueDate: '2026-06-01', approvedBy: null, hasAttachment: false, version: 'v0.1' },
  { id: '18', name: 'Leistungsverzeichnis Fassade', type: 'LV', module: 'LP 6', moduleId: 'lp6', status: 'entwurf', dueDate: '2026-06-15', approvedBy: null, hasAttachment: false, version: 'v0.1' },
];

function getStatusColor(status: string | null | undefined) {
  switch (status) {
    case 'genehmigt':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'in_pruefung':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'entwurf':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
    case 'abgelehnt':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'ueberarbeitung':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'genehmigt':
      return 'Genehmigt';
    case 'in_pruefung':
      return 'In Prüfung';
    case 'entwurf':
      return 'Entwurf';
    case 'abgelehnt':
      return 'Abgelehnt';
    case 'ueberarbeitung':
      return 'Überarbeitung';
    default:
      return status ?? 'unknown';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function DeliverablesPage() {
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const types = [...new Set(mockDeliverables.map((d) => d.type))];

  const filteredDeliverables = mockDeliverables.filter((d) => {
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (moduleFilter !== 'all' && d.moduleId !== moduleFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ergebnisse suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredDeliverables.length} Ergebnisse
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Module</SelectItem>
            <SelectItem value="lp1">LP 1</SelectItem>
            <SelectItem value="lp2">LP 2</SelectItem>
            <SelectItem value="lp3">LP 3</SelectItem>
            <SelectItem value="lp4">LP 4</SelectItem>
            <SelectItem value="lp5">LP 5</SelectItem>
            <SelectItem value="lp6">LP 6</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="entwurf">Entwurf</SelectItem>
            <SelectItem value="in_pruefung">In Prüfung</SelectItem>
            <SelectItem value="genehmigt">Genehmigt</SelectItem>
            <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
            <SelectItem value="ueberarbeitung">Überarbeitung</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Typ</TableHead>
              <TableHead className="w-[80px]">Modul</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px]">Fällig</TableHead>
              <TableHead className="w-[180px]">Genehmigt von</TableHead>
              <TableHead className="w-[60px]">Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeliverables.length > 0 ? (
              filteredDeliverables.map((deliverable) => (
                <TableRow
                  key={deliverable.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{deliverable.name}</span>
                      {deliverable.hasAttachment && (
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {deliverable.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {deliverable.module}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-[10px] ${getStatusColor(deliverable.status)}`}
                    >
                      {getStatusLabel(deliverable.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs ${
                        new Date(deliverable.dueDate) < new Date() &&
                        deliverable.status !== 'genehmigt'
                          ? 'font-medium text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatDate(deliverable.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {deliverable.approvedBy ? (
                      <div className="flex items-center gap-1 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span>{deliverable.approvedBy}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        &ndash;
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {deliverable.version}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Keine Ergebnisse gefunden
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
