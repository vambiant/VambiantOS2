'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  Plus,
  UserPlus,
  X,
} from 'lucide-react';

interface BidPosition {
  posNr: string;
  kurztext: string;
  menge: number;
  einheit: string;
  ep: number;
  gp: number;
}

interface Bidder {
  id: number;
  firma: string;
  ansprechpartner: string;
  email: string;
  status: 'Eingeladen' | 'Eingegangen' | 'Geprüft' | 'Abgelehnt' | 'Nicht eingereicht';
  angebotssumme: number | null;
  eingangsdatum: string | null;
  positionen: BidPosition[];
}

const mockBidders: Bidder[] = [
  {
    id: 1,
    firma: 'Hoffmann Bau GmbH',
    ansprechpartner: 'Peter Hoffmann',
    email: 'angebot@hoffmann-bau.de',
    status: 'Geprüft',
    angebotssumme: 1185000,
    eingangsdatum: '2026-03-28',
    positionen: [
      { posNr: '01.0010', kurztext: 'Baugrube ausheben', menge: 1250, einheit: 'm³', ep: 26.00, gp: 32500 },
      { posNr: '01.0020', kurztext: 'Bodenabtransport', menge: 950, einheit: 'm³', ep: 38.50, gp: 36575 },
      { posNr: '02.0010', kurztext: 'Sauberkeitsschicht', menge: 420, einheit: 'm²', ep: 16.50, gp: 6930 },
    ],
  },
  {
    id: 2,
    firma: 'Müller & Söhne Rohbau',
    ansprechpartner: 'Karl Müller',
    email: 'vergabe@mueller-rohbau.de',
    status: 'Eingegangen',
    angebotssumme: 1245000,
    eingangsdatum: '2026-03-30',
    positionen: [
      { posNr: '01.0010', kurztext: 'Baugrube ausheben', menge: 1250, einheit: 'm³', ep: 29.00, gp: 36250 },
      { posNr: '01.0020', kurztext: 'Bodenabtransport', menge: 950, einheit: 'm³', ep: 44.00, gp: 41800 },
      { posNr: '02.0010', kurztext: 'Sauberkeitsschicht', menge: 420, einheit: 'm²', ep: 19.00, gp: 7980 },
    ],
  },
  {
    id: 3,
    firma: 'Berliner Baugesellschaft AG',
    ansprechpartner: 'Andrea Schmidt',
    email: 'ausschreibung@bbg-ag.de',
    status: 'Geprüft',
    angebotssumme: 1098500,
    eingangsdatum: '2026-03-27',
    positionen: [
      { posNr: '01.0010', kurztext: 'Baugrube ausheben', menge: 1250, einheit: 'm³', ep: 24.50, gp: 30625 },
      { posNr: '01.0020', kurztext: 'Bodenabtransport', menge: 950, einheit: 'm³', ep: 36.00, gp: 34200 },
      { posNr: '02.0010', kurztext: 'Sauberkeitsschicht', menge: 420, einheit: 'm²', ep: 15.80, gp: 6636 },
    ],
  },
  {
    id: 4,
    firma: 'Krause Hochbau GmbH',
    ansprechpartner: 'Thomas Krause',
    email: 'info@krause-hochbau.de',
    status: 'Eingeladen',
    angebotssumme: null,
    eingangsdatum: null,
    positionen: [],
  },
  {
    id: 5,
    firma: 'Dresdner Bau AG',
    ansprechpartner: 'Sabine Werner',
    email: 'vergabe@dresdner-bau.de',
    status: 'Nicht eingereicht',
    angebotssumme: null,
    eingangsdatum: null,
    positionen: [],
  },
];

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'Eingeladen':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Eingegangen':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'Geprüft':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'Abgelehnt':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'Nicht eingereicht':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusIcon(status: string | null | undefined) {
  switch (status) {
    case 'Geprüft':
      return <Check className="h-3.5 w-3.5" />;
    case 'Eingegangen':
      return <Clock className="h-3.5 w-3.5" />;
    case 'Eingeladen':
      return <Mail className="h-3.5 w-3.5" />;
    case 'Abgelehnt':
    case 'Nicht eingereicht':
      return <X className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AVABidsPage() {
  const [expandedBidder, setExpandedBidder] = useState<number | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const eingegangen = mockBidders.filter(
    (b) => b.status === 'Eingegangen' || b.status === 'Geprüft',
  ).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ava" className="hover:text-foreground">AVA</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/ava/1" className="hover:text-foreground">AVA-2026-001</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Bieter/Angebote</span>
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
            <h1 className="text-2xl font-bold tracking-tight">Bieter & Angebote</h1>
            <p className="text-sm text-muted-foreground">
              {eingegangen} von {mockBidders.length} Angeboten eingegangen
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Bieter einladen
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold">Neuen Bieter einladen</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Firma</label>
              <input
                type="text"
                placeholder="Firmenname"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ansprechpartner</label>
              <input
                type="text"
                placeholder="Name"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">E-Mail</label>
              <input
                type="email"
                placeholder="email@firma.de"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" />
                Einladung senden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bidder List */}
      <div className="space-y-3">
        {mockBidders.map((bidder) => (
          <div
            key={bidder.id}
            className="rounded-xl border bg-card shadow-sm transition-colors"
          >
            {/* Bidder Header */}
            <div
              className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/30"
              onClick={() =>
                setExpandedBidder(expandedBidder === bidder.id ? null : bidder.id)
              }
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{bidder.firma}</p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(bidder.status)}`}
                  >
                    {getStatusIcon(bidder.status)}
                    {bidder.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {bidder.ansprechpartner} &middot; {bidder.email}
                </p>
              </div>
              <div className="text-right">
                {bidder.angebotssumme ? (
                  <div>
                    <p className="text-lg font-bold">{formatCurrency(bidder.angebotssumme)} EUR</p>
                    <p className="text-xs text-muted-foreground">
                      Eingang: {formatDate(bidder.eingangsdatum!)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Kein Angebot</p>
                )}
              </div>
              <div>
                {expandedBidder === bidder.id ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expanded Bid Detail */}
            {expandedBidder === bidder.id && bidder.positionen.length > 0 && (
              <div className="border-t">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Pos-Nr</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Kurztext</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Menge</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Einheit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">EP</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">GP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bidder.positionen.map((pos) => (
                        <tr key={pos.posNr} className="hover:bg-muted/20">
                          <td className="px-4 py-2 font-mono text-xs">{pos.posNr}</td>
                          <td className="px-4 py-2">{pos.kurztext}</td>
                          <td className="px-4 py-2 text-right">{pos.menge.toLocaleString('de-DE')}</td>
                          <td className="px-4 py-2 text-muted-foreground">{pos.einheit}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(pos.ep)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(pos.gp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Angebot eingeben for invited bidders */}
            {expandedBidder === bidder.id && bidder.positionen.length === 0 && (
              <div className="border-t p-6">
                <h4 className="text-sm font-semibold">Angebot eingeben</h4>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Angebotssumme (netto)</label>
                    <input
                      type="text"
                      placeholder="0,00 EUR"
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Eingangsdatum</label>
                    <input
                      type="date"
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Angebot speichern
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
