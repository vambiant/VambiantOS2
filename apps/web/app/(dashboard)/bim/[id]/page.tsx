'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  ChevronRight,
  Layers,
  List,
  Settings2,
} from 'lucide-react';

const mockModel = {
  id: 1,
  name: 'Bürogebäude Friedrichstraße - Architektur',
  projekt: 'Neubau Bürogebäude Friedrichstraße',
  format: 'IFC 4.0',
  version: 'v3.2',
  schema: 'IFC4 ADD2',
  software: 'Autodesk Revit 2025',
  datum: '2026-03-08',
  groesse: '245 MB',
  raeume: 128,
  elemente: 15420,
  etagen: 7,
  geschosse: ['UG', 'EG', '1.OG', '2.OG', '3.OG', '4.OG', '5.OG'],
};

interface Raum {
  id: number;
  raumNr: string;
  name: string;
  etage: string;
  flaeche: number;
  nutzung: string;
}

const mockRaeume: Raum[] = [
  { id: 1, raumNr: 'EG.001', name: 'Empfang / Foyer', etage: 'EG', flaeche: 85.4, nutzung: 'Verkehrsfläche' },
  { id: 2, raumNr: 'EG.002', name: 'Besprechungsraum 1', etage: 'EG', flaeche: 28.6, nutzung: 'Büro' },
  { id: 3, raumNr: 'EG.003', name: 'Teeküche', etage: 'EG', flaeche: 12.3, nutzung: 'Nebenraum' },
  { id: 4, raumNr: 'EG.004', name: 'WC Herren', etage: 'EG', flaeche: 18.2, nutzung: 'Sanitär' },
  { id: 5, raumNr: 'EG.005', name: 'WC Damen', etage: 'EG', flaeche: 18.2, nutzung: 'Sanitär' },
  { id: 6, raumNr: '1.OG.001', name: 'Großraumbüro Ost', etage: '1.OG', flaeche: 156.8, nutzung: 'Büro' },
  { id: 7, raumNr: '1.OG.002', name: 'Einzelbüro 1', etage: '1.OG', flaeche: 18.5, nutzung: 'Büro' },
  { id: 8, raumNr: '1.OG.003', name: 'Einzelbüro 2', etage: '1.OG', flaeche: 18.5, nutzung: 'Büro' },
  { id: 9, raumNr: '1.OG.004', name: 'Serverraum', etage: '1.OG', flaeche: 22.0, nutzung: 'Technik' },
  { id: 10, raumNr: '2.OG.001', name: 'Großraumbüro West', etage: '2.OG', flaeche: 148.3, nutzung: 'Büro' },
  { id: 11, raumNr: '2.OG.002', name: 'Besprechungsraum 3', etage: '2.OG', flaeche: 32.1, nutzung: 'Büro' },
  { id: 12, raumNr: '2.OG.003', name: 'Archiv', etage: '2.OG', flaeche: 24.7, nutzung: 'Lager' },
];

interface Kollision {
  id: number;
  typ: string;
  element1: string;
  element2: string;
  etage: string;
  schwere: 'Kritisch' | 'Warnung' | 'Info';
}

const mockKollisionen: Kollision[] = [
  { id: 1, typ: 'Durchdringung', element1: 'Wand EG.W.012', element2: 'Lüftungskanal LK-003', etage: 'EG', schwere: 'Kritisch' },
  { id: 2, typ: 'Durchdringung', element1: 'Decke D.1OG', element2: 'Fallrohr FR-007', etage: '1.OG', schwere: 'Warnung' },
  { id: 3, typ: 'Abstandsverletzung', element1: 'Stütze ST.034', element2: 'Heizungsrohr HR-012', etage: '2.OG', schwere: 'Warnung' },
  { id: 4, typ: 'Durchdringung', element1: 'Unterzug UZ.008', element2: 'Kabeltrasse KT-015', etage: '3.OG', schwere: 'Info' },
];

function getNutzungColor(nutzung: string): string {
  switch (nutzung) {
    case 'Büro':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Verkehrsfläche':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'Sanitär':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400';
    case 'Nebenraum':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'Technik':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'Lager':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getSchwereColor(schwere: string): string {
  switch (schwere) {
    case 'Kritisch':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'Warnung':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'Info':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

type TabId = 'raumbuch' | 'eigenschaften' | 'kollisionen';

export default function BIMDetailPage() {
  const [activeTab, setActiveTab] = useState<TabId>('raumbuch');

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'raumbuch', label: 'Raumbuch', icon: List },
    { id: 'eigenschaften', label: 'Eigenschaften', icon: Settings2 },
    { id: 'kollisionen', label: 'Kollisionen', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/bim" className="hover:text-foreground">BIM</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{mockModel.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/bim"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{mockModel.name}</h1>
          <p className="text-sm text-muted-foreground">{mockModel.projekt}</p>
        </div>
      </div>

      {/* 3D Viewer Placeholder */}
      <div className="relative rounded-xl border bg-gradient-to-br from-muted/80 to-muted/40 shadow-sm overflow-hidden" style={{ height: '400px' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative">
            <Box className="h-20 w-20 text-muted-foreground/30 animate-pulse" strokeWidth={1} />
            <Layers className="absolute bottom-0 right-0 h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            3D Viewer wird geladen...
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            xeokit WebGL Viewer
          </p>
        </div>
        {/* Corner controls placeholder */}
        <div className="absolute right-4 top-4 flex gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background/80 text-xs font-medium shadow-sm backdrop-blur">
            +
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background/80 text-xs font-medium shadow-sm backdrop-blur">
            -
          </div>
        </div>
        {/* Floor selector */}
        <div className="absolute left-4 top-4 rounded-lg bg-background/80 p-2 shadow-sm backdrop-blur">
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">Geschoss</p>
          <div className="flex flex-col gap-0.5">
            {mockModel.geschosse.map((g) => (
              <button
                key={g}
                type="button"
                className="rounded px-2 py-0.5 text-xs transition-colors hover:bg-accent"
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Info Sidebar (displayed as cards) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground">Format</p>
          <p className="mt-0.5 text-sm font-bold">{mockModel.format}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground">Version</p>
          <p className="mt-0.5 text-sm font-bold">{mockModel.version}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground">Räume</p>
          <p className="mt-0.5 text-sm font-bold">{mockModel.raeume}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground">Elemente</p>
          <p className="mt-0.5 text-sm font-bold">{mockModel.elemente.toLocaleString('de-DE')}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground">Geschosse</p>
          <p className="mt-0.5 text-sm font-bold">{mockModel.etagen}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground">Größe</p>
          <p className="mt-0.5 text-sm font-bold">{mockModel.groesse}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-1">
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
                {tab.id === 'kollisionen' && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {mockKollisionen.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'raumbuch' && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Raum-Nr</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Etage</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Fläche (m²)</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nutzung</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockRaeume.map((raum) => (
                  <tr key={raum.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-6 py-3 font-mono text-xs">{raum.raumNr}</td>
                    <td className="px-6 py-3 font-medium">{raum.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{raum.etage}</td>
                    <td className="px-6 py-3 text-right">{raum.flaeche.toFixed(1)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getNutzungColor(raum.nutzung)}`}>
                        {raum.nutzung}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'eigenschaften' && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground">Modelleigenschaften</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { label: 'IFC-Schema', value: mockModel.schema },
              { label: 'Erstellungssoftware', value: mockModel.software },
              { label: 'Format', value: mockModel.format },
              { label: 'Version', value: mockModel.version },
              { label: 'Dateigröße', value: mockModel.groesse },
              { label: 'Hochgeladen am', value: new Date(mockModel.datum).toLocaleDateString('de-DE') },
              { label: 'Anzahl Geschosse', value: mockModel.etagen.toString() },
              { label: 'Anzahl Räume', value: mockModel.raeume.toString() },
              { label: 'Anzahl Elemente', value: mockModel.elemente.toLocaleString('de-DE') },
              { label: 'Projekt', value: mockModel.projekt },
            ].map((prop) => (
              <div key={prop.label} className="flex justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">{prop.label}</span>
                <span className="text-sm font-medium">{prop.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'kollisionen' && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Schwere</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Typ</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Element 1</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Element 2</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Etage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockKollisionen.map((k) => (
                  <tr key={k.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${getSchwereColor(k.schwere)}`}>
                        <AlertTriangle className="h-3 w-3" />
                        {k.schwere}
                      </span>
                    </td>
                    <td className="px-6 py-3">{k.typ}</td>
                    <td className="px-6 py-3 font-mono text-xs">{k.element1}</td>
                    <td className="px-6 py-3 font-mono text-xs">{k.element2}</td>
                    <td className="px-6 py-3 text-muted-foreground">{k.etage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
