'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  Euro,
  MapPin,
  Plus,
  Search,
  Store,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

type ListingTab = 'offer' | 'request';

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<ListingTab>('offer');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: listingsData, isLoading } = trpc.marketplace.listings.list.useQuery({
    page: 1,
    pageSize: 50,
    listingType: activeTab,
    search: searchQuery || undefined,
    status: 'active',
  });

  const listings = listingsData?.items ?? [];

  const { data: offersCount } = trpc.marketplace.listings.list.useQuery({
    page: 1, pageSize: 1, listingType: 'offer', status: 'active',
  });
  const { data: requestsCount } = trpc.marketplace.listings.list.useQuery({
    page: 1, pageSize: 1, listingType: 'request', status: 'active',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marktplatz</h1>
          <p className="text-muted-foreground">
            Kapazitäten anbieten und suchen
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Neues Inserat
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab('offer')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'offer'
              ? 'bg-background text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Angebote
          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-bold">
            {offersCount?.total ?? 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('request')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'request'
              ? 'bg-background text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Gesuche
          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-bold">
            {requestsCount?.total ?? 0}
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Suchen nach Titel oder Beschreibung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Listing Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Wird geladen...
          </div>
        ) : listings.map((listing) => {
          const trades = Array.isArray(listing.trades) ? (listing.trades as string[]) : [];
          const availability = listing.availability as Record<string, string> | null;
          const pricing = listing.pricing as Record<string, string | number> | null;
          const location = listing.location as Record<string, string> | null;

          return (
            <div
              key={listing.id}
              className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-accent/30"
            >
              {/* Company Header */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold">{listing.title}</h3>
                  {location?.city && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {location.city}
                    </div>
                  )}
                </div>
              </div>

              {/* Trades */}
              {trades.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {trades.map((g) => (
                    <span
                      key={g}
                      className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {listing.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {listing.description}
                </p>
              )}

              {/* Details */}
              <div className="mt-4 space-y-1.5 border-t pt-3">
                {availability?.startDate && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Verfügbarkeit
                    </span>
                    <span className="font-medium">Ab {availability.startDate}</span>
                  </div>
                )}
                {pricing?.amount && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Euro className="h-3 w-3" />
                      Preisindikation
                    </span>
                    <span className="font-medium">{pricing.amount} {pricing.currency ?? 'EUR'}/{pricing.type ?? 'h'}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-[10px] text-muted-foreground">
                  Erstellt: {formatDate(listing.createdAt)}
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Kontaktieren
                </button>
              </div>
            </div>
          );
        })}

        {!isLoading && listings.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <Store className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Keine Inserate gefunden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
