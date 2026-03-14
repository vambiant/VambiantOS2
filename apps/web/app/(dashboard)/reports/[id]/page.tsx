'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlignLeft,
  ArrowLeft,
  Bold,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Heading1,
  Heading2,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Sparkles,
  Table,
  Underline,
} from 'lucide-react';

const mockReport = {
  id: 2,
  titel: 'Variantenvergleich Fassadensysteme',
  typ: 'Variantenvergleich' as const,
  projekt: 'Neubau Bürogebäude Friedrichstraße',
  status: 'In Bearbeitung',
  version: 'v1.3',
  autor: 'Maria Schneider',
  erstellt: '2026-02-15',
  aktualisiert: '2026-03-10',
};

const sections = [
  { id: 's1', label: '1. Einleitung', active: false },
  { id: 's2', label: '2. Aufgabenstellung', active: false },
  { id: 's3', label: '3. Varianten', active: true },
  { id: 's3a', label: '   3.1 Variante A: Pfosten-Riegel', active: false },
  { id: 's3b', label: '   3.2 Variante B: Elementfassade', active: false },
  { id: 's3c', label: '   3.3 Variante C: Vorhangfassade', active: false },
  { id: 's4', label: '4. Bewertungsmatrix', active: false },
  { id: 's5', label: '5. Empfehlung', active: false },
  { id: 's6', label: '6. Anhang', active: false },
];

const versions = [
  { version: 'v1.3', datum: '10.03.2026', autor: 'Maria Schneider' },
  { version: 'v1.2', datum: '05.03.2026', autor: 'Maria Schneider' },
  { version: 'v1.1', datum: '28.02.2026', autor: 'Dr. Thomas Weber' },
  { version: 'v1.0', datum: '15.02.2026', autor: 'Maria Schneider' },
];

interface VariantRow {
  kriterium: string;
  gewicht: number;
  varianteA: number;
  varianteB: number;
  varianteC: number;
}

const variantenMatrix: VariantRow[] = [
  { kriterium: 'Energieeffizienz', gewicht: 25, varianteA: 7, varianteB: 9, varianteC: 8 },
  { kriterium: 'Kosten (Erstellung)', gewicht: 20, varianteA: 8, varianteB: 6, varianteC: 7 },
  { kriterium: 'Wartungsaufwand', gewicht: 15, varianteA: 6, varianteB: 8, varianteC: 9 },
  { kriterium: 'Gestaltungsfreiheit', gewicht: 15, varianteA: 7, varianteB: 8, varianteC: 9 },
  { kriterium: 'Bauzeit', gewicht: 10, varianteA: 7, varianteB: 9, varianteC: 6 },
  { kriterium: 'Schallschutz', gewicht: 10, varianteA: 8, varianteB: 7, varianteC: 8 },
  { kriterium: 'Brandschutz', gewicht: 5, varianteA: 8, varianteB: 7, varianteC: 7 },
];

function getScoreColor(score: number): string {
  if (score >= 8) return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
  if (score >= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
}

export default function ReportDetailPage() {
  const [showVersions, setShowVersions] = useState(false);
  const [activeSection, setActiveSection] = useState('s3');
  const isVariant = mockReport.typ === 'Variantenvergleich';

  const toolbarItems = [
    { icon: Bold, label: 'Fett' },
    { icon: Italic, label: 'Kursiv' },
    { icon: Underline, label: 'Unterstrichen' },
    null,
    { icon: Heading1, label: 'Überschrift 1' },
    { icon: Heading2, label: 'Überschrift 2' },
    null,
    { icon: List, label: 'Aufzählung' },
    { icon: ListOrdered, label: 'Nummerierung' },
    null,
    { icon: Link2, label: 'Link' },
    { icon: Image, label: 'Bild' },
    { icon: Table, label: 'Tabelle' },
    { icon: AlignLeft, label: 'Ausrichten' },
  ];

  // Calculate weighted scores
  const sumA = variantenMatrix.reduce((sum, r) => sum + r.varianteA * r.gewicht, 0) / 100;
  const sumB = variantenMatrix.reduce((sum, r) => sum + r.varianteB * r.gewicht, 0) / 100;
  const sumC = variantenMatrix.reduce((sum, r) => sum + r.varianteC * r.gewicht, 0) / 100;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/reports" className="hover:text-foreground">Berichte</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{mockReport.titel}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{mockReport.titel}</h1>
            <p className="text-sm text-muted-foreground">
              {mockReport.projekt} &middot; {mockReport.autor}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Version Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVersions(!showVersions)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
            >
              <Clock className="h-4 w-4" />
              {mockReport.version}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showVersions && (
              <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border bg-popover p-1 shadow-lg">
                {versions.map((v) => (
                  <button
                    key={v.version}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                    onClick={() => setShowVersions(false)}
                  >
                    <span className="font-medium">{v.version}</span>
                    <span className="text-xs text-muted-foreground">
                      {v.datum} - {v.autor}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <Sparkles className="h-4 w-4" />
            KI-Entwurf erstellen
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <Eye className="h-4 w-4" />
            Vorschau
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            PDF exportieren
          </button>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="flex gap-6">
        {/* Section Navigation Sidebar */}
        <div className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-6 rounded-xl border bg-card p-3 shadow-sm">
            <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">Gliederung</h3>
            <nav className="space-y-0.5">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Rich Text Editor Area */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 bg-muted/30 px-2 py-1.5">
            {toolbarItems.map((item, idx) =>
              item === null ? (
                <div key={`sep-${idx}`} className="mx-1 h-5 w-px bg-border" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title={item.label}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              ),
            )}
          </div>

          {/* Editor Placeholder */}
          <div className="min-h-[500px] rounded-b-xl border bg-card p-8 shadow-sm">
            <h2 className="text-xl font-bold">3. Varianten</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Im Rahmen der Entwurfsplanung wurden drei Fassadenvarianten für das Bürogebäude
              Friedrichstraße untersucht und bewertet. Die Varianten unterscheiden sich in ihrer
              konstruktiven Ausführung, den energetischen Eigenschaften sowie den Herstellungs-
              und Unterhaltungskosten.
            </p>
            <h3 className="mt-6 text-lg font-semibold">3.1 Variante A: Pfosten-Riegel-Fassade</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Die Pfosten-Riegel-Fassade besteht aus einem Aluminiumtragwerk mit thermisch
              getrennten Profilen. Die Verglasung erfolgt als 3-fach-Isolierverglasung mit einem
              Ug-Wert von 0,6 W/(m²K). Die Brüstungsbereiche werden mit hinterlüfteten
              Faserzementplatten verkleidet.
            </p>
            <h3 className="mt-6 text-lg font-semibold">3.2 Variante B: Elementfassade</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Die Elementfassade wird als vorgefertigte Fassadenelemente mit integrierten
              Sonnenschutzlamellen ausgeführt. Die Elemente werden geschossweise montiert
              und bieten eine hohe Vorfertigung bei kurzer Bauzeit vor Ort. Die Anschlüsse
              zwischen den Elementen werden mit EPDM-Dichtungen ausgeführt.
            </p>
            <h3 className="mt-6 text-lg font-semibold">3.3 Variante C: Vorhangfassade</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Die Vorhangfassade wird als vorgehängte Konstruktion mit großformatigen
              Glasscheiben und integrierten photovoltaischen Elementen realisiert. Diese
              Variante bietet die höchste gestalterische Flexibilität und ermöglicht eine
              individuelle Fassadengestaltung je Geschoss.
            </p>
          </div>
        </div>
      </div>

      {/* Variant Comparison Matrix (only for Variantenvergleich type) */}
      {isVariant && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Bewertungsmatrix</h2>
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Kriterium</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Gewicht</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      <div>Variante A</div>
                      <div className="text-[10px] font-normal">Pfosten-Riegel</div>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      <div>Variante B</div>
                      <div className="text-[10px] font-normal">Elementfassade</div>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      <div>Variante C</div>
                      <div className="text-[10px] font-normal">Vorhangfassade</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {variantenMatrix.map((row) => (
                    <tr key={row.kriterium} className="hover:bg-muted/20">
                      <td className="px-6 py-3 font-medium">{row.kriterium}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium">
                          {row.gewicht}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${getScoreColor(row.varianteA)}`}>
                          {row.varianteA}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${getScoreColor(row.varianteB)}`}>
                          {row.varianteB}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${getScoreColor(row.varianteC)}`}>
                          {row.varianteC}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Weighted Total */}
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td className="px-6 py-3">Gewichtete Gesamtpunktzahl</td>
                    <td className="px-4 py-3 text-center">100%</td>
                    <td className="px-4 py-3 text-center text-lg">{sumA.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-lg">{sumB.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-lg">{sumC.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Radar Chart Placeholder */}
          <div className="flex items-center justify-center rounded-xl border bg-card p-12 shadow-sm">
            <div className="text-center">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                <span className="text-sm text-muted-foreground">Radar-Chart</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Grafischer Variantenvergleich wird hier dargestellt
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
