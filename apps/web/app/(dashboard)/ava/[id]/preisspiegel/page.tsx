'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Medal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface BidderPrice {
  bidder: string;
  ep: number;
  gp: number;
}

interface PreisspiegelRow {
  posNr: string;
  kurztext: string;
  menge: number;
  einheit: string;
  bids: BidderPrice[];
}

const bidders = [
  { id: 1, name: 'Hoffmann Bau GmbH', rank: 2 },
  { id: 2, name: 'Müller & Söhne', rank: 3 },
  { id: 3, name: 'Berliner Bauges.', rank: 1 },
];

const mockRows: PreisspiegelRow[] = [
  {
    posNr: '01.0010',
    kurztext: 'Baugrube ausheben, Tiefe bis 3,00 m',
    menge: 1250,
    einheit: 'm³',
    bids: [
      { bidder: 'Hoffmann Bau GmbH', ep: 26.00, gp: 32500 },
      { bidder: 'Müller & Söhne', ep: 29.00, gp: 36250 },
      { bidder: 'Berliner Bauges.', ep: 24.50, gp: 30625 },
    ],
  },
  {
    posNr: '01.0020',
    kurztext: 'Bodenabtransport und Entsorgung',
    menge: 950,
    einheit: 'm³',
    bids: [
      { bidder: 'Hoffmann Bau GmbH', ep: 38.50, gp: 36575 },
      { bidder: 'Müller & Söhne', ep: 44.00, gp: 41800 },
      { bidder: 'Berliner Bauges.', ep: 36.00, gp: 34200 },
    ],
  },
  {
    posNr: '01.0030',
    kurztext: 'Verbau Berliner Verbau, Tiefe 3,00 m',
    menge: 185,
    einheit: 'm²',
    bids: [
      { bidder: 'Hoffmann Bau GmbH', ep: 92.00, gp: 17020 },
      { bidder: 'Müller & Söhne', ep: 98.00, gp: 18130 },
      { bidder: 'Berliner Bauges.', ep: 88.50, gp: 16372.5 },
    ],
  },
  {
    posNr: '02.0010',
    kurztext: 'Sauberkeitsschicht C12/15, d=10cm',
    menge: 420,
    einheit: 'm²',
    bids: [
      { bidder: 'Hoffmann Bau GmbH', ep: 16.50, gp: 6930 },
      { bidder: 'Müller & Söhne', ep: 19.00, gp: 7980 },
      { bidder: 'Berliner Bauges.', ep: 15.80, gp: 6636 },
    ],
  },
  {
    posNr: '02.0020',
    kurztext: 'Fundamentplatte C30/37, d=50cm',
    menge: 420,
    einheit: 'm²',
    bids: [
      { bidder: 'Hoffmann Bau GmbH', ep: 178.00, gp: 74760 },
      { bidder: 'Müller & Söhne', ep: 192.00, gp: 80640 },
      { bidder: 'Berliner Bauges.', ep: 172.00, gp: 72240 },
    ],
  },
  {
    posNr: '02.0030',
    kurztext: 'Betonstahl BSt 500 S',
    menge: 32500,
    einheit: 'kg',
    bids: [
      { bidder: 'Hoffmann Bau GmbH', ep: 2.75, gp: 89375 },
      { bidder: 'Müller & Söhne', ep: 2.95, gp: 95875 },
      { bidder: 'Berliner Bauges.', ep: 2.60, gp: 84500 },
    ],
  },
  {
    posNr: '03.0010',
    kurztext: 'KS-Mauerwerk 24cm',
    menge: 650,
    einheit: 'm²',
    bids: [
      { bidder: 'Hoffmann Bau GmbH', ep: 82.00, gp: 53300 },
      { bidder: 'Müller & Söhne', ep: 88.00, gp: 57200 },
      { bidder: 'Berliner Bauges.', ep: 79.50, gp: 51675 },
    ],
  },
  {
    posNr: '03.0020',
    kurztext: 'KS-Mauerwerk 17,5cm',
    menge: 380,
    einheit: 'm²',
    bids: [
      { bidder: 'Hoffmann Bau GmbH', ep: 65.00, gp: 24700 },
      { bidder: 'Müller & Söhne', ep: 72.00, gp: 27360 },
      { bidder: 'Berliner Bauges.', ep: 63.00, gp: 23940 },
    ],
  },
];

function formatCurrency(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCellColor(ep: number, allEps: number[]): string {
  const min = Math.min(...allEps);
  const max = Math.max(...allEps);
  if (ep === min) return 'bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400';
  if (ep === max) return 'bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400';
}

function getCorridorBar(ep: number, allEps: number[]): number {
  const min = Math.min(...allEps);
  const max = Math.max(...allEps);
  if (max === min) return 50;
  return ((ep - min) / (max - min)) * 100;
}

function getRankBadge(rank: number): string {
  switch (rank) {
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

export default function PreisspiegelPage() {
  const bidderTotals = bidders.map((bidder) => {
    const total = mockRows.reduce((sum, row) => {
      const bid = row.bids.find((b) => b.bidder === bidder.name);
      return sum + (bid?.gp ?? 0);
    }, 0);
    return { ...bidder, total };
  });

  const sortedByTotal = [...bidderTotals].sort((a, b) => a.total - b.total);
  const lowestTotal = sortedByTotal[0]?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ava" className="hover:text-foreground">AVA</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/ava/1" className="hover:text-foreground">AVA-2026-001</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Preisspiegel</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/ava/1"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preisspiegel</h1>
          <p className="text-sm text-muted-foreground">
            Angebotsvergleich - Rohbauarbeiten AVA-2026-001
          </p>
        </div>
      </div>

      {/* Ranking Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {sortedByTotal.map((bidder, idx) => (
          <div
            key={bidder.id}
            className={`rounded-xl border bg-card p-4 shadow-sm ${idx === 0 ? 'ring-2 ring-green-500/30' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${getRankBadge(idx + 1)}`}
                >
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold">{bidder.name}</span>
              </div>
              {idx === 0 && <Medal className="h-5 w-5 text-green-600" />}
            </div>
            <p className="mt-2 text-xl font-bold">{formatCurrency(bidder.total)} EUR</p>
            {idx > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <TrendingUp className="h-3 w-3" />
                +{formatCurrency(bidder.total - lowestTotal)} EUR (
                {((bidder.total - lowestTotal) / lowestTotal * 100).toFixed(1)}%)
              </p>
            )}
            {idx === 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                <TrendingDown className="h-3 w-3" />
                Günstigstes Angebot
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Comparison Matrix */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-medium text-muted-foreground">
                  Pos-Nr
                </th>
                <th className="sticky left-[80px] z-10 bg-muted/50 px-4 py-3 text-left font-medium text-muted-foreground">
                  Kurztext
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Menge</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Einh.</th>
                {bidders.map((bidder) => (
                  <th
                    key={bidder.id}
                    className="px-4 py-3 text-center font-medium text-muted-foreground"
                    colSpan={2}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${getRankBadge(bidder.rank)}`}
                      >
                        {bidder.rank}
                      </span>
                      {bidder.name}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  Korridor
                </th>
              </tr>
              <tr className="border-b bg-muted/30">
                <th className="sticky left-0 z-10 bg-muted/30" />
                <th className="sticky left-[80px] z-10 bg-muted/30" />
                <th />
                <th />
                {bidders.map((bidder) => (
                  <>
                    <th key={`${bidder.id}-ep`} className="px-2 py-1.5 text-right text-[10px] font-medium text-muted-foreground">
                      EP
                    </th>
                    <th key={`${bidder.id}-gp`} className="px-2 py-1.5 text-right text-[10px] font-medium text-muted-foreground">
                      GP
                    </th>
                  </>
                ))}
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockRows.map((row) => {
                const allEps = row.bids.map((b) => b.ep);
                return (
                  <tr key={row.posNr} className="hover:bg-muted/20">
                    <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {row.posNr}
                    </td>
                    <td className="sticky left-[80px] z-10 bg-card px-4 py-2.5 max-w-[200px] truncate">
                      {row.kurztext}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.menge.toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.einheit}</td>
                    {row.bids.map((bid) => (
                      <>
                        <td
                          key={`${row.posNr}-${bid.bidder}-ep`}
                          className={`px-2 py-2.5 text-right font-medium ${getCellColor(bid.ep, allEps)}`}
                        >
                          {formatCurrency(bid.ep)}
                        </td>
                        <td
                          key={`${row.posNr}-${bid.bidder}-gp`}
                          className="px-2 py-2.5 text-right text-muted-foreground"
                        >
                          {formatCurrency(bid.gp)}
                        </td>
                      </>
                    ))}
                    <td className="px-4 py-2.5">
                      <div className="relative h-2 w-full rounded-full bg-muted">
                        {row.bids.map((bid, idx) => {
                          const pos = getCorridorBar(bid.ep, allEps);
                          const colors = ['bg-blue-500', 'bg-amber-500', 'bg-green-500'];
                          return (
                            <div
                              key={`${row.posNr}-corridor-${idx}`}
                              className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${colors[idx] ?? 'bg-gray-500'}`}
                              style={{ left: `calc(${pos}% - 6px)` }}
                              title={`${bid.bidder}: ${formatCurrency(bid.ep)}`}
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Summary Row */}
              <tr className="border-t-2 bg-muted/50 font-bold">
                <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3" />
                <td className="sticky left-[80px] z-10 bg-muted/50 px-4 py-3">Gesamtsumme</td>
                <td />
                <td />
                {bidderTotals.map((bidder) => (
                  <>
                    <td key={`${bidder.id}-total-ep`} className="px-2 py-3" />
                    <td key={`${bidder.id}-total-gp`} className="px-2 py-3 text-right">
                      {formatCurrency(bidder.total)}
                    </td>
                  </>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
