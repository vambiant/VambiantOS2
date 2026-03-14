'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FileUp,
  GripVertical,
  Plus,
  Save,
} from 'lucide-react';

interface LVPosition {
  id: string;
  posNr: string;
  kurztext: string;
  menge: number | null;
  einheit: string;
  ep: number | null;
  gp: number | null;
  isGroup: boolean;
  level: number;
  children?: LVPosition[];
  expanded?: boolean;
}

const mockLV: LVPosition[] = [
  {
    id: 'g1',
    posNr: '01',
    kurztext: 'Erdarbeiten',
    menge: null,
    einheit: '',
    ep: null,
    gp: 245000,
    isGroup: true,
    level: 0,
    expanded: true,
    children: [
      {
        id: 'p1',
        posNr: '01.0010',
        kurztext: 'Baugrube ausheben, Tiefe bis 3,00 m',
        menge: 1250,
        einheit: 'm³',
        ep: 28.50,
        gp: 35625,
        isGroup: false,
        level: 1,
      },
      {
        id: 'p2',
        posNr: '01.0020',
        kurztext: 'Bodenabtransport und Entsorgung',
        menge: 950,
        einheit: 'm³',
        ep: 42.00,
        gp: 39900,
        isGroup: false,
        level: 1,
      },
      {
        id: 'p3',
        posNr: '01.0030',
        kurztext: 'Verbau Berliner Verbau, Tiefe 3,00 m',
        menge: 185,
        einheit: 'm²',
        ep: 95.00,
        gp: 17575,
        isGroup: false,
        level: 1,
      },
      {
        id: 'p4',
        posNr: '01.0040',
        kurztext: 'Baugrubensohle verdichten',
        menge: 420,
        einheit: 'm²',
        ep: 8.50,
        gp: 3570,
        isGroup: false,
        level: 1,
      },
    ],
  },
  {
    id: 'g2',
    posNr: '02',
    kurztext: 'Gründung',
    menge: null,
    einheit: '',
    ep: null,
    gp: 312000,
    isGroup: true,
    level: 0,
    expanded: true,
    children: [
      {
        id: 'p5',
        posNr: '02.0010',
        kurztext: 'Sauberkeitsschicht Beton C12/15, d=10cm',
        menge: 420,
        einheit: 'm²',
        ep: 18.00,
        gp: 7560,
        isGroup: false,
        level: 1,
      },
      {
        id: 'p6',
        posNr: '02.0020',
        kurztext: 'Fundamentplatte C30/37, d=50cm, bewehrt',
        menge: 420,
        einheit: 'm²',
        ep: 185.00,
        gp: 77700,
        isGroup: false,
        level: 1,
      },
      {
        id: 'p7',
        posNr: '02.0030',
        kurztext: 'Betonstahl BSt 500 S, liefern und verlegen',
        menge: 32500,
        einheit: 'kg',
        ep: 2.85,
        gp: 92625,
        isGroup: false,
        level: 1,
      },
    ],
  },
  {
    id: 'g3',
    posNr: '03',
    kurztext: 'Mauerwerk',
    menge: null,
    einheit: '',
    ep: null,
    gp: 198000,
    isGroup: true,
    level: 0,
    expanded: false,
    children: [
      {
        id: 'p8',
        posNr: '03.0010',
        kurztext: 'KS-Mauerwerk 24cm, Festigkeitsklasse 20',
        menge: 650,
        einheit: 'm²',
        ep: 85.00,
        gp: 55250,
        isGroup: false,
        level: 1,
      },
      {
        id: 'p9',
        posNr: '03.0020',
        kurztext: 'KS-Mauerwerk 17,5cm, Festigkeitsklasse 12',
        menge: 380,
        einheit: 'm²',
        ep: 68.00,
        gp: 25840,
        isGroup: false,
        level: 1,
      },
    ],
  },
  {
    id: 'g4',
    posNr: '04',
    kurztext: 'Stahlbetonarbeiten',
    menge: null,
    einheit: '',
    ep: null,
    gp: 490000,
    isGroup: true,
    level: 0,
    expanded: false,
    children: [],
  },
];

const mockLots = [
  { id: 1, name: 'Los 1 - Rohbau Gebäude A' },
  { id: 2, name: 'Los 2 - Rohbau Gebäude B' },
];

function formatCurrency(value: number | null): string {
  if (value === null) return '';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMenge(value: number | null): string {
  if (value === null) return '';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function AVAPositionsPage() {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(mockLV.filter((g) => g.expanded).map((g) => g.id)),
  );
  const [activeLot, setActiveLot] = useState(1);
  const [showGaebExport, setShowGaebExport] = useState(false);

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const totalGP = mockLV.reduce((sum, g) => sum + (g.gp ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ava" className="hover:text-foreground">AVA</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/ava/1" className="hover:text-foreground">AVA-2026-001</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Leistungsverzeichnis</span>
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
            <h1 className="text-2xl font-bold tracking-tight">Leistungsverzeichnis</h1>
            <p className="text-sm text-muted-foreground">Rohbauarbeiten - AVA-2026-001</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <FileUp className="h-4 w-4" />
            GAEB importieren
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowGaebExport(!showGaebExport)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              GAEB exportieren
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showGaebExport && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border bg-popover p-1 shadow-lg">
                {['DA81 - Langtext', 'DA83 - Preisanfrage', 'DA84 - Angebotsabgabe'].map((format) => (
                  <button
                    key={format}
                    type="button"
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                    onClick={() => setShowGaebExport(false)}
                  >
                    {format}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Speichern
          </button>
        </div>
      </div>

      {/* Los Tabs */}
      <div className="flex gap-1 border-b">
        {mockLots.map((lot) => (
          <button
            key={lot.id}
            type="button"
            onClick={() => setActiveLot(lot.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeLot === lot.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
            }`}
          >
            {lot.name}
          </button>
        ))}
      </div>

      {/* LV Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pos-Nr</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kurztext</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Menge</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Einheit</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">EP</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">GP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockLV.map((group) => (
                <>
                  {/* Group Row */}
                  <tr
                    key={group.id}
                    className="bg-muted/30 font-medium transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <td className="px-2 py-3 text-center">
                      {expandedGroups.has(group.id) ? (
                        <ChevronDown className="mx-auto h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mx-auto h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold">{group.posNr}</td>
                    <td className="px-4 py-3 font-bold" colSpan={4}>{group.kurztext}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatCurrency(group.gp)}
                    </td>
                  </tr>

                  {/* Position Rows */}
                  {expandedGroups.has(group.id) &&
                    group.children?.map((pos) => (
                      <tr
                        key={pos.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-2 py-2.5 text-center">
                          <GripVertical className="mx-auto h-3.5 w-3.5 text-muted-foreground/40 cursor-grab" />
                        </td>
                        <td className="px-4 py-2.5 pl-8 font-mono text-xs text-muted-foreground">
                          {pos.posNr}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            defaultValue={pos.kurztext}
                            className="w-full bg-transparent text-sm outline-none focus:border-b focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="text"
                            defaultValue={formatMenge(pos.menge)}
                            className="w-20 bg-transparent text-right text-sm outline-none focus:border-b focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{pos.einheit}</td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="text"
                            defaultValue={formatCurrency(pos.ep)}
                            className="w-24 bg-transparent text-right text-sm outline-none focus:border-b focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {formatCurrency(pos.gp)}
                        </td>
                      </tr>
                    ))}
                </>
              ))}

              {/* Total Row */}
              <tr className="border-t-2 bg-muted/50 font-bold">
                <td className="px-2 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3" colSpan={4}>Gesamtsumme (netto)</td>
                <td className="px-4 py-3 text-right text-base">
                  {formatCurrency(totalGP)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Position hinzufügen
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Gruppe hinzufügen
        </button>
      </div>
    </div>
  );
}
