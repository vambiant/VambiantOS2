'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  Check,
  ChevronRight,
  FileText,
  Medal,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';

interface RankedBidder {
  id: number;
  rang: number;
  firma: string;
  angebotssumme: number;
  abweichung: number;
  bewertung: number;
  status: 'Offen' | 'Zuschlag' | 'Abgelehnt';
  begruendung: string;
}

const mockBidders: RankedBidder[] = [
  {
    id: 3,
    rang: 1,
    firma: 'Berliner Baugesellschaft AG',
    angebotssumme: 1098500,
    abweichung: 0,
    bewertung: 92,
    status: 'Offen',
    begruendung: '',
  },
  {
    id: 1,
    rang: 2,
    firma: 'Hoffmann Bau GmbH',
    angebotssumme: 1185000,
    abweichung: 7.87,
    bewertung: 85,
    status: 'Offen',
    begruendung: '',
  },
  {
    id: 2,
    rang: 3,
    firma: 'Müller & Söhne Rohbau',
    angebotssumme: 1245000,
    abweichung: 13.33,
    bewertung: 78,
    status: 'Offen',
    begruendung: '',
  },
];

function formatCurrency(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getRankColor(rang: number): string {
  switch (rang) {
    case 1:
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 2:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 3:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'Zuschlag':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'Abgelehnt':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
  }
}

export default function AVAAwardPage() {
  const [bidders, setBidders] = useState(mockBidders);
  const [decisionReason, setDecisionReason] = useState('');
  const [selectedBidderId, setSelectedBidderId] = useState<number | null>(null);

  const hasAward = bidders.some((b) => b.status === 'Zuschlag');

  function handleAward(id: number) {
    setBidders((prev) =>
      prev.map((b) => ({
        ...b,
        status: b.id === id ? 'Zuschlag' : b.status === 'Offen' ? 'Abgelehnt' : b.status,
      })),
    );
  }

  function handleReject(id: number) {
    setBidders((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Abgelehnt' } : b)),
    );
  }

  function handleReset(id: number) {
    setBidders((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Offen' } : b)),
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ava" className="hover:text-foreground">AVA</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/ava/1" className="hover:text-foreground">AVA-2026-001</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Vergabe</span>
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
            <h1 className="text-2xl font-bold tracking-tight">Vergabeentscheidung</h1>
            <p className="text-sm text-muted-foreground">
              Rohbauarbeiten - AVA-2026-001
            </p>
          </div>
        </div>
        {hasAward && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            Vergabeschreiben erstellen
          </button>
        )}
      </div>

      {/* Award Status Banner */}
      {hasAward && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/10">
          <Award className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-700 dark:text-green-400">
              Zuschlag erteilt an {bidders.find((b) => b.status === 'Zuschlag')?.firma}
            </p>
            <p className="text-sm text-green-600 dark:text-green-500">
              Angebotssumme:{' '}
              {formatCurrency(bidders.find((b) => b.status === 'Zuschlag')?.angebotssumme ?? 0)} EUR
            </p>
          </div>
        </div>
      )}

      {/* Bidder Ranking */}
      <div className="space-y-4">
        {bidders.map((bidder) => (
          <div
            key={bidder.id}
            className={`rounded-xl border bg-card shadow-sm transition-all ${
              bidder.status === 'Zuschlag'
                ? 'ring-2 ring-green-500/30'
                : bidder.status === 'Abgelehnt'
                  ? 'opacity-60'
                  : ''
            }`}
          >
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
              {/* Rank */}
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${getRankColor(bidder.rang)}`}
                >
                  {bidder.rang === 1 ? (
                    <Medal className="h-6 w-6" />
                  ) : (
                    bidder.rang
                  )}
                </div>
                <div>
                  <p className="font-semibold">{bidder.firma}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(bidder.status)}`}
                    >
                      {bidder.status}
                    </span>
                    <span className="text-xs text-muted-foreground">Rang {bidder.rang}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-1 items-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Angebotssumme</p>
                  <p className="text-lg font-bold">{formatCurrency(bidder.angebotssumme)} EUR</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Abweichung</p>
                  <p className={`text-sm font-medium ${bidder.abweichung === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {bidder.abweichung === 0 ? 'Niedrigstes' : `+${bidder.abweichung.toFixed(2)}%`}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Bewertung</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${bidder.bewertung}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{bidder.bewertung}/100</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {bidder.status === 'Offen' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAward(bidder.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-green-700"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Zuschlag
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(bidder.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/10"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Ablehnen
                    </button>
                  </>
                )}
                {(bidder.status === 'Zuschlag' || bidder.status === 'Abgelehnt') && (
                  <button
                    type="button"
                    onClick={() => handleReset(bidder.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                    Zurücksetzen
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Decision Reason */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold">Vergabebegründung</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Dokumentieren Sie die Gründe für Ihre Vergabeentscheidung
        </p>
        <textarea
          value={decisionReason}
          onChange={(e) => setDecisionReason(e.target.value)}
          placeholder="Begründung der Vergabeentscheidung eingeben..."
          rows={5}
          className="mt-3 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Check className="h-4 w-4" />
            Begründung speichern
          </button>
        </div>
      </div>
    </div>
  );
}
