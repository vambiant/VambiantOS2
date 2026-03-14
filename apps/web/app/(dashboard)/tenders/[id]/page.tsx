'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  Euro,
  FileText,
  MapPin,
  Search,
  Star,
  Target,
} from 'lucide-react';

const mockTender = {
  id: 3,
  titel: 'Wohnungsbau Pankow 120 WE',
  auftraggeber: 'HOWOGE',
  ort: 'Berlin-Pankow',
  frist: '2026-05-01',
  wert: '8.500.000 EUR',
  score: 94,
  stage: 'Analysiert',
  gebaeude: 'Wohnungsbau',
  cpvCodes: ['71240000 - Dienstleistungen von Architektur-/Ingenieurbüros', '71221000 - Dienstleistungen von Architekturbüros'],
  verfahren: 'Nicht offener Wettbewerb',
  loseAnzahl: 1,
  kontakt: 'Vergabestelle HOWOGE, Frau Kerstin Lehmann',
  veroeffentlicht: '2026-02-20',
  referenzNr: 'HOWOGE-2026-VgV-042',
};

type TabId = 'details' | 'analyse' | 'bewertung' | 'qa' | 'angebot';

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'analyse', label: 'Analyse', icon: Search },
  { id: 'bewertung', label: 'Bewertung', icon: Star },
  { id: 'qa', label: 'QA', icon: ClipboardCheck },
  { id: 'angebot', label: 'Angebot', icon: Euro },
];

interface AnalysisScore {
  dimension: string;
  score: number;
  max: number;
  beschreibung: string;
}

const analyseScores: AnalysisScore[] = [
  { dimension: 'Strategische Passung', score: 9, max: 10, beschreibung: 'Wohnungsbau ist Kernkompetenz, HOWOGE ist Bestandskunde' },
  { dimension: 'Technische Machbarkeit', score: 8, max: 10, beschreibung: 'Standardwohnungsbau, keine besonderen technischen Herausforderungen' },
  { dimension: 'Finanzielle Tragfähigkeit', score: 9, max: 10, beschreibung: 'Gute Honorarbasis, kalkulierbares Risiko' },
  { dimension: 'Kapazität', score: 7, max: 10, beschreibung: 'Team verfügbar ab LP 1, leichte Überlappung mit Friedrichstraße' },
  { dimension: 'Referenzlage', score: 10, max: 10, beschreibung: 'Exzellente Referenzen im Wohnungsbau Berlin' },
  { dimension: 'Wettbewerbslage', score: 8, max: 10, beschreibung: 'Geschätzter Wettbewerb: 5-8 Teilnehmer' },
];

interface ScoringDimension {
  kriterium: string;
  gewicht: number;
  score: number;
}

const scoringDimensions: ScoringDimension[] = [
  { kriterium: 'Projektorganisation', gewicht: 20, score: 9 },
  { kriterium: 'Referenzen', gewicht: 25, score: 10 },
  { kriterium: 'Terminplanung', gewicht: 15, score: 8 },
  { kriterium: 'Qualitätsmanagement', gewicht: 15, score: 8 },
  { kriterium: 'Nachhaltigkeit', gewicht: 10, score: 7 },
  { kriterium: 'Honorar', gewicht: 15, score: 9 },
];

interface QAItem {
  id: number;
  frage: string;
  status: 'Offen' | 'Erledigt' | 'Kritisch';
  verantwortlich: string;
}

const qaItems: QAItem[] = [
  { id: 1, frage: 'Referenzprojekte aufbereitet?', status: 'Erledigt', verantwortlich: 'Maria Schneider' },
  { id: 2, frage: 'Projektorganigramm erstellt?', status: 'Erledigt', verantwortlich: 'Dr. Thomas Weber' },
  { id: 3, frage: 'Terminplan plausibilisiert?', status: 'Offen', verantwortlich: 'Peter Hoffmann' },
  { id: 4, frage: 'Honorarermittlung geprüft?', status: 'Offen', verantwortlich: 'Dr. Thomas Weber' },
  { id: 5, frage: 'Nachhaltigkeitskonzept vorbereitet?', status: 'Kritisch', verantwortlich: 'Sandra Braun' },
  { id: 6, frage: 'Eignungsnachweise vollständig?', status: 'Erledigt', verantwortlich: 'Andrea Müller' },
  { id: 7, frage: 'BIM-Konzept formuliert?', status: 'Offen', verantwortlich: 'Maria Schneider' },
  { id: 8, frage: 'Vier-Augen-Prüfung durchgeführt?', status: 'Offen', verantwortlich: 'Ing. Klaus Fischer' },
];

function getQAStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'Erledigt':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'Offen':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'Kritisch':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function TenderDetailPage() {
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const daysLeft = Math.ceil(
    (new Date(mockTender.frist).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const compositeScore =
    scoringDimensions.reduce((sum, d) => sum + d.score * d.gewicht, 0) /
    scoringDimensions.reduce((sum, d) => sum + d.gewicht, 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/tenders" className="hover:text-foreground">Ausschreibungen</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{mockTender.titel}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/tenders"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{mockTender.titel}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
                {mockTender.stage}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {mockTender.referenzNr}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Frist:</span>
            <span className="font-medium">{formatDate(mockTender.frist)}</span>
          </div>
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
              daysLeft > 14
                ? 'bg-green-100 text-green-700'
                : daysLeft > 7
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {daysLeft > 0 ? `${daysLeft} Tage` : 'Abgelaufen'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground">Auftraggeber</h3>
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{mockTender.auftraggeber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {mockTender.ort}
                </div>
                <div className="text-sm text-muted-foreground">
                  Kontakt: {mockTender.kontakt}
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground">Verfahren</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verfahrensart</span>
                  <span className="font-medium">{mockTender.verfahren}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lose</span>
                  <span className="font-medium">{mockTender.loseAnzahl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Veröffentlicht</span>
                  <span className="font-medium">{formatDate(mockTender.veroeffentlicht)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Abgabefrist</span>
                  <span className="font-medium">{formatDate(mockTender.frist)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground">Geschätzter Wert</h3>
              <p className="mt-2 text-3xl font-bold">{mockTender.wert}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Honorarvolumen nach HOAI (Schätzung)
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground">CPV-Codes</h3>
              <div className="mt-3 space-y-2">
                {mockTender.cpvCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded-md bg-muted px-3 py-2 text-xs font-mono"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground">Gebäudetyp</h3>
              <span className="mt-2 inline-flex rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {mockTender.gebaeude}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Analyse Tab */}
      {activeTab === 'analyse' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Strategische Passung', score: 9, farbe: 'text-green-600' },
              { label: 'Technische Machbarkeit', score: 8, farbe: 'text-blue-600' },
              { label: 'Finanzielle Tragfähigkeit', score: 9, farbe: 'text-purple-600' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border bg-card p-4 shadow-sm text-center">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className={`mt-1 text-3xl font-bold ${item.farbe}`}>
                  {item.score}<span className="text-base font-normal text-muted-foreground">/10</span>
                </p>
              </div>
            ))}
          </div>

          {/* Radar Chart Placeholder */}
          <div className="flex items-center justify-center rounded-xl border bg-card p-8 shadow-sm">
            <div className="text-center">
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                <Target className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Radar-Chart: Mehrdimensionale Analyse
              </p>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Dimension</th>
                    <th className="px-6 py-3 text-center font-medium text-muted-foreground">Score</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Bewertung</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Begründung</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analyseScores.map((item) => (
                    <tr key={item.dimension} className="hover:bg-muted/20">
                      <td className="px-6 py-3 font-medium">{item.dimension}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                          item.score >= 8 ? 'bg-green-100 text-green-700' : item.score >= 6 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.score}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="h-2 w-24 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${(item.score / item.max) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{item.beschreibung}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bewertung Tab */}
      {activeTab === 'bewertung' && (
        <div className="space-y-6">
          {/* Composite Score */}
          <div className="rounded-xl border bg-card p-6 shadow-sm text-center">
            <p className="text-sm font-medium text-muted-foreground">Gesamtbewertung (gewichtet)</p>
            <p className="mt-2 text-5xl font-bold text-primary">
              {compositeScore.toFixed(1)}
              <span className="text-xl font-normal text-muted-foreground">/10</span>
            </p>
          </div>

          {/* Scoring Dimensions */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scoringDimensions.map((dim) => (
              <div key={dim.kriterium} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{dim.kriterium}</h3>
                  <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium">
                    {dim.gewicht}%
                  </span>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    defaultValue={dim.score}
                    className="h-12 w-16 rounded-lg border text-center text-2xl font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="mb-2 text-sm text-muted-foreground">/ 10</span>
                  <div className="mb-2 flex-1">
                    <div className="h-3 rounded-full bg-muted">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          dim.score >= 8 ? 'bg-green-500' : dim.score >= 6 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(dim.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QA Tab */}
      {activeTab === 'qa' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Prüfcheckliste</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-600">
                {qaItems.filter((q) => q.status === 'Erledigt').length} erledigt
              </span>
              <span className="text-amber-600">
                {qaItems.filter((q) => q.status === 'Offen').length} offen
              </span>
              <span className="text-red-600">
                {qaItems.filter((q) => q.status === 'Kritisch').length} kritisch
              </span>
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {qaItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/30"
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      item.status === 'Erledigt'
                        ? 'bg-green-100 text-green-600'
                        : item.status === 'Kritisch'
                          ? 'bg-red-100 text-red-600'
                          : 'border'
                    }`}
                  >
                    {item.status === 'Erledigt' && <Check className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${item.status === 'Erledigt' ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                      {item.frage}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.verantwortlich}</p>
                  </div>
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getQAStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Angebot Tab */}
      {activeTab === 'angebot' && (
        <div className="rounded-xl border bg-card p-8 shadow-sm text-center">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">Angebot wird erstellt</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Das Angebot für &ldquo;{mockTender.titel}&rdquo; befindet sich in Vorbereitung.
            Schließen Sie zuerst die QA-Prüfung ab.
          </p>
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            Angebot generieren
          </button>
        </div>
      )}
    </div>
  );
}
