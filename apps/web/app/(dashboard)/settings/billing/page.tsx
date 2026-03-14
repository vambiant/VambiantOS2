'use client';

import { Check, CreditCard, Download, ExternalLink } from 'lucide-react';

// TODO: Replace with real billing data from tRPC query
const currentPlan = {
  name: 'Professional',
  price: '49',
  billingCycle: 'monatlich',
  nextBillingDate: '2026-04-01',
  seats: 10,
  usedSeats: 4,
};

const plans = [
  {
    name: 'Starter',
    price: '19',
    description: 'Für kleine Büros und Freelancer',
    features: [
      'Bis zu 3 Nutzer',
      '5 aktive Projekte',
      'Grundlegende Zeiterfassung',
      'E-Mail-Support',
    ],
    isCurrent: false,
  },
  {
    name: 'Professional',
    price: '49',
    description: 'Für wachsende Ingenieurbüros',
    features: [
      'Bis zu 10 Nutzer',
      'Unbegrenzte Projekte',
      'HOAI-Kalkulation',
      'AVA-System',
      'Rechnungserstellung',
      'Prioritäts-Support',
    ],
    isCurrent: true,
  },
  {
    name: 'Enterprise',
    price: '99',
    description: 'Für große Planungsbüros',
    features: [
      'Unbegrenzte Nutzer',
      'Unbegrenzte Projekte',
      'BIM-Integration',
      'Marktplatz-Zugang',
      'API-Zugang',
      'SSO & erweiterte Sicherheit',
      'Dedizierter Support',
    ],
    isCurrent: false,
  },
];

const invoiceHistory = [
  { id: 'INV-2026-003', date: '2026-03-01', amount: '49,00 EUR', status: 'Bezahlt' },
  { id: 'INV-2026-002', date: '2026-02-01', amount: '49,00 EUR', status: 'Bezahlt' },
  { id: 'INV-2026-001', date: '2026-01-01', amount: '49,00 EUR', status: 'Bezahlt' },
  { id: 'INV-2025-012', date: '2025-12-01', amount: '49,00 EUR', status: 'Bezahlt' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function SettingsBillingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Current plan */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Aktueller Plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sie nutzen den{' '}
              <span className="font-medium text-foreground">
                {currentPlan.name}
              </span>{' '}
              Plan
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{currentPlan.price} EUR</p>
            <p className="text-sm text-muted-foreground">
              pro Nutzer / {currentPlan.billingCycle}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Genutzte Plätze</p>
            <p className="mt-1 text-xl font-semibold">
              {currentPlan.usedSeats} / {currentPlan.seats}
            </p>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{
                  width: `${(currentPlan.usedSeats / currentPlan.seats) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Nächste Abrechnung
            </p>
            <p className="mt-1 text-xl font-semibold">
              {formatDate(currentPlan.nextBillingDate)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Zahlungsmethode</p>
            <div className="mt-1 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">**** 4242</span>
            </div>
            <button
              type="button"
              className="mt-1 text-xs text-primary hover:underline"
            >
              Ändern
            </button>
          </div>
        </div>
      </div>

      {/* Plans comparison */}
      <div>
        <h2 className="text-lg font-semibold">Verfügbare Pläne</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Wählen Sie den Plan, der am besten zu Ihrem Unternehmen passt
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 ${
                plan.isCurrent
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'bg-card shadow-sm'
              }`}
            >
              {plan.isCurrent && (
                <span className="mb-3 inline-flex rounded-md bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  Aktueller Plan
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.description}
              </p>
              <div className="mt-4">
                <span className="text-3xl font-bold">{plan.price} EUR</span>
                <span className="text-sm text-muted-foreground">
                  {' '}
                  / Nutzer / Monat
                </span>
              </div>

              <ul className="mt-6 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm font-medium opacity-50"
                  >
                    Aktueller Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                  >
                    Wechseln
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Rechnungshistorie</h2>
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Kundenportal öffnen
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  Rechnungsnummer
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  Datum
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  Betrag
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                  Aktion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoiceHistory.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <td className="px-6 py-3 font-medium">{invoice.id}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {formatDate(invoice.date)}
                  </td>
                  <td className="px-6 py-3">{invoice.amount}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
