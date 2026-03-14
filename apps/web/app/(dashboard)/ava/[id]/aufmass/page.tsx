'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Eye,
  FileCheck,
  Plus,
  Ruler,
  Send,
} from 'lucide-react';

interface AufmassEntry {
  id: number;
  datum: string;
  position: string;
  posNr: string;
  menge: number;
  einheit: string;
  status: 'Entwurf' | 'Eingereicht' | 'Geprüft';
  pruefer: string | null;
  bemerkung: string;
}

const mockEntries: AufmassEntry[] = [
  {
    id: 1,
    datum: '2026-03-05',
    position: 'Baugrube ausheben, Tiefe bis 3,00 m',
    posNr: '01.0010',
    menge: 450,
    einheit: 'm³',
    status: 'Geprüft',
    pruefer: 'Dipl.-Ing. Schneider',
    bemerkung: 'Abschnitt A1-A3 fertiggestellt',
  },
  {
    id: 2,
    datum: '2026-03-08',
    position: 'Bodenabtransport und Entsorgung',
    posNr: '01.0020',
    menge: 380,
    einheit: 'm³',
    status: 'Geprüft',
    pruefer: 'Dipl.-Ing. Schneider',
    bemerkung: 'Entsorgungsnachweis liegt vor',
  },
  {
    id: 3,
    datum: '2026-03-10',
    position: 'Baugrube ausheben, Tiefe bis 3,00 m',
    posNr: '01.0010',
    menge: 320,
    einheit: 'm³',
    status: 'Eingereicht',
    pruefer: null,
    bemerkung: 'Abschnitt A4-A6',
  },
  {
    id: 4,
    datum: '2026-03-12',
    position: 'Verbau Berliner Verbau, Tiefe 3,00 m',
    posNr: '01.0030',
    menge: 85,
    einheit: 'm²',
    status: 'Eingereicht',
    pruefer: null,
    bemerkung: 'Nordseite komplett',
  },
  {
    id: 5,
    datum: '2026-03-14',
    position: 'Sauberkeitsschicht C12/15, d=10cm',
    posNr: '02.0010',
    menge: 120,
    einheit: 'm²',
    status: 'Entwurf',
    pruefer: null,
    bemerkung: 'Bereich Gebäude A, Achse 1-4',
  },
];

interface CumulativeRow {
  posNr: string;
  kurztext: string;
  einheit: string;
  lvMenge: number;
  gemessen: number;
  geprueft: number;
  offen: number;
}

const cumulativeData: CumulativeRow[] = [
  { posNr: '01.0010', kurztext: 'Baugrube ausheben', einheit: 'm³', lvMenge: 1250, gemessen: 770, geprueft: 450, offen: 480 },
  { posNr: '01.0020', kurztext: 'Bodenabtransport', einheit: 'm³', lvMenge: 950, gemessen: 380, geprueft: 380, offen: 570 },
  { posNr: '01.0030', kurztext: 'Verbau Berliner Verbau', einheit: 'm²', lvMenge: 185, gemessen: 85, geprueft: 0, offen: 100 },
  { posNr: '02.0010', kurztext: 'Sauberkeitsschicht', einheit: 'm²', lvMenge: 420, gemessen: 120, geprueft: 0, offen: 300 },
];

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'Entwurf':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'Eingereicht':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'Geprüft':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusIcon(status: string | null | undefined) {
  switch (status) {
    case 'Entwurf':
      return <Clock className="h-3.5 w-3.5" />;
    case 'Eingereicht':
      return <Send className="h-3.5 w-3.5" />;
    case 'Geprüft':
      return <Check className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AufmassPage() {
  const [view, setView] = useState<'entries' | 'cumulative'>('entries');
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ava" className="hover:text-foreground">AVA</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/ava/1" className="hover:text-foreground">AVA-2026-001</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Aufmaß</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ava/1"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Aufmaß</h1>
            <p className="text-sm text-muted-foreground">
              Rohbauarbeiten - AVA-2026-001
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Aufmaß erfassen
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setView('entries')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            view === 'entries' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ruler className="h-4 w-4" />
          Einzelaufmaße
        </button>
        <button
          type="button"
          onClick={() => setView('cumulative')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            view === 'cumulative' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          Kumulative Abrechnung
        </button>
      </div>

      {/* Add Measurement Form */}
      {showAddForm && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold">Neues Aufmaß erfassen</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Datum</label>
              <input
                type="date"
                defaultValue="2026-03-10"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">LV-Position</label>
              <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Position wählen...</option>
                <option value="01.0010">01.0010 - Baugrube ausheben</option>
                <option value="01.0020">01.0020 - Bodenabtransport</option>
                <option value="01.0030">01.0030 - Verbau Berliner Verbau</option>
                <option value="02.0010">02.0010 - Sauberkeitsschicht</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Menge</label>
              <input
                type="number"
                placeholder="0,00"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bemerkung</label>
              <input
                type="text"
                placeholder="Hinweis zum Aufmaß"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <Check className="h-4 w-4" />
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Entries View */}
      {view === 'entries' && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Datum</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Pos-Nr</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Position</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Menge</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Einheit</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Bemerkung</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockEntries.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(entry.datum)}</td>
                    <td className="px-6 py-4 font-mono text-xs">{entry.posNr}</td>
                    <td className="px-6 py-4">{entry.position}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      {entry.menge.toLocaleString('de-DE')}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{entry.einheit}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(entry.status)}`}
                      >
                        {getStatusIcon(entry.status)}
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate">
                      {entry.bemerkung}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {entry.status === 'Entwurf' && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10"
                          >
                            <Send className="h-3 w-3" />
                            Einreichen
                          </button>
                        )}
                        {entry.status === 'Eingereicht' && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-900/10"
                          >
                            <FileCheck className="h-3 w-3" />
                            Prüfen
                          </button>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cumulative View */}
      {view === 'cumulative' && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Pos-Nr</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Kurztext</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Einheit</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">LV-Menge</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Gemessen</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Geprüft</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Offen</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Fortschritt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cumulativeData.map((row) => {
                  const progress = (row.gemessen / row.lvMenge) * 100;
                  const verifiedProgress = (row.geprueft / row.lvMenge) * 100;
                  return (
                    <tr key={row.posNr} className="transition-colors hover:bg-muted/50">
                      <td className="px-6 py-4 font-mono text-xs">{row.posNr}</td>
                      <td className="px-6 py-4">{row.kurztext}</td>
                      <td className="px-6 py-4 text-muted-foreground">{row.einheit}</td>
                      <td className="px-6 py-4 text-right">{row.lvMenge.toLocaleString('de-DE')}</td>
                      <td className="px-6 py-4 text-right font-medium">
                        {row.gemessen.toLocaleString('de-DE')}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">
                        {row.geprueft.toLocaleString('de-DE')}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        {row.offen.toLocaleString('de-DE')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-32">
                            <div className="relative h-2 rounded-full bg-muted">
                              <div
                                className="absolute h-2 rounded-full bg-green-500 transition-all"
                                style={{ width: `${verifiedProgress}%` }}
                              />
                              <div
                                className="absolute h-2 rounded-full bg-amber-400/60 transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
