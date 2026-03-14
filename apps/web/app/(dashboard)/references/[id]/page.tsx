'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Euro,
  Image,
  MapPin,
  Users,
} from 'lucide-react';

const mockReference = {
  id: 1,
  name: 'Wohnquartier Tempelhof',
  auftraggeber: 'DEGEWO',
  gebaeudetyp: 'Wohnungsbau',
  jahr: 2025,
  ort: 'Berlin-Tempelhof',
  wert: '12.500.000 EUR',
  teamgroesse: 8,
  bgf: '14.200 m²',
  wohneinheiten: 180,
  bauzeit: '24 Monate',
  leistungsphasen: 'LP 1-8',
  beschreibung:
    'Neubau von 180 Wohneinheiten in 4 Baukörpern mit Tiefgarage und Außenanlagen. Das Projekt wurde im KfW-40-Standard realisiert und mit dem DGNB Gold-Zertifikat ausgezeichnet. Die Baukörper gruppieren sich um einen gemeinsamen Innenhof mit Spielplatz und Aufenthaltsbereichen.',
  besonderheiten: [
    'KfW-Effizienzhaus 40',
    'DGNB Gold-Zertifizierung',
    'BIM-Planung ab LP 3',
    'Holzhybrid-Konstruktion',
    'Regenwassernutzung',
    'PV-Anlage auf Dachflächen',
  ],
};

interface TimelineEntry {
  datum: string;
  titel: string;
  beschreibung: string;
}

const timeline: TimelineEntry[] = [
  { datum: '2022-06-01', titel: 'Planungsbeginn', beschreibung: 'Start LP 1 - Grundlagenermittlung' },
  { datum: '2022-09-15', titel: 'Entwurfsplanung', beschreibung: 'Abschluss LP 3, Entwurf vom Bauherrn freigegeben' },
  { datum: '2023-01-20', titel: 'Baugenehmigung', beschreibung: 'Baugenehmigung durch Bezirksamt erteilt' },
  { datum: '2023-03-10', titel: 'Ausschreibung', beschreibung: 'Start LP 7, Ausschreibung der Rohbauarbeiten' },
  { datum: '2023-06-01', titel: 'Baubeginn', beschreibung: 'Baustart Erdarbeiten und Gründung' },
  { datum: '2024-02-15', titel: 'Richtfest', beschreibung: 'Richtfest aller 4 Baukörper' },
  { datum: '2024-11-30', titel: 'Abnahme', beschreibung: 'Bauabnahme und Übergabe an Bauherrn' },
  { datum: '2025-01-15', titel: 'DGNB Gold', beschreibung: 'DGNB Gold-Zertifizierung erhalten' },
];

const gewerke = [
  'Objektplanung Gebäude',
  'Freianlagenplanung',
  'Tragwerksplanung',
  'Technische Ausrüstung (HLS)',
  'Technische Ausrüstung (Elektro)',
  'Brandschutzplanung',
  'Bauphysik',
  'SiGeKo',
];

const images = [
  { id: 1, label: 'Ansicht Südwest' },
  { id: 2, label: 'Innenhof' },
  { id: 3, label: 'Fassadendetail' },
  { id: 4, label: 'Innenraum Musterwohnung' },
  { id: 5, label: 'Grundriss EG' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });
}

export default function ReferenceDetailPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/references" className="hover:text-foreground">Referenzen</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{mockReference.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/references"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{mockReference.name}</h1>
            <p className="text-sm text-muted-foreground">
              {mockReference.auftraggeber} &middot; {mockReference.ort} &middot; {mockReference.jahr}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          PDF exportieren
        </button>
      </div>

      {/* Image Gallery Placeholder */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-muted/80 to-muted/40 shadow-sm" style={{ height: '400px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Image className="h-20 w-20 text-muted-foreground/30" />
        </div>
        {/* Gallery Navigation */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-4">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                className={`h-2 rounded-full transition-all ${
                  idx === 0 ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
                }`}
                title={img.label}
              />
            ))}
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {/* Image Counter */}
        <div className="absolute right-4 top-4 rounded-md bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
          1 / {images.length}
        </div>
      </div>

      {/* Project Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Projektbeschreibung</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {mockReference.beschreibung}
            </p>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Projektverlauf</h2>
            <div className="mt-4">
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-muted" />
                <div className="space-y-6">
                  {timeline.map((entry, idx) => (
                    <div key={entry.datum} className="relative flex gap-4 pl-9">
                      <div
                        className={`absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 ${
                          idx === timeline.length - 1
                            ? 'border-green-500 bg-green-500'
                            : 'border-primary bg-background'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatDate(entry.datum)}
                          </span>
                          <h3 className="text-sm font-semibold">{entry.titel}</h3>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {entry.beschreibung}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Key Facts */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground">Projektdaten</h3>
            <div className="mt-3 space-y-3">
              {[
                { icon: Building, label: 'Gebäudetyp', value: mockReference.gebaeudetyp },
                { icon: MapPin, label: 'Standort', value: mockReference.ort },
                { icon: Euro, label: 'Baukosten', value: mockReference.wert },
                { icon: Users, label: 'Teamgröße', value: `${mockReference.teamgroesse} Personen` },
                { icon: Calendar, label: 'Bauzeit', value: mockReference.bauzeit },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground">BGF</p>
                  <p className="text-sm font-medium">{mockReference.bgf}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground">Wohneinheiten</p>
                  <p className="text-sm font-medium">{mockReference.wohneinheiten}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leistungsphasen */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground">Leistungsphasen</h3>
            <p className="mt-2 text-lg font-bold text-primary">{mockReference.leistungsphasen}</p>
          </div>

          {/* Besonderheiten */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground">Besonderheiten</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mockReference.besonderheiten.map((b) => (
                <span
                  key={b}
                  className="inline-flex rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Gewerke */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground">Gewerke</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {gewerke.map((g) => (
                <span
                  key={g}
                  className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
