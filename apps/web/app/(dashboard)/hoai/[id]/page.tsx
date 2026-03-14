'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Loader2,
  Lock,
  Send,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';
import {
  calculateHoaiFee,
  getPhasePercentages,
  type HoaiServiceType,
  type HoaiZone,
} from '@vambiant/domain';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  expired: 'Abgelaufen',
  published: 'Veroeffentlicht',
  cancelled: 'Storniert',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'accepted':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'sent':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function HoaiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data: procurement, isLoading, error } = trpc.procurement.getById.useQuery(
    { id },
    { enabled: id > 0 },
  );

  const sendMutation = trpc.procurement.send.useMutation();
  const acceptMutation = trpc.procurement.accept.useMutation();
  const utils = trpc.useUtils();

  const [sendingAction, setSendingAction] = useState<string | null>(null);

  // Extract HOAI params from the procurement
  const hoaiParams = procurement?.hoaiParams as {
    serviceType?: string;
    zone?: number;
    baseCosts?: number;
    calculatedFeeMin?: number;
    calculatedFeeMax?: number;
    offeredFee?: number;
    conversionFactor?: number;
    coordinationFactor?: number;
  } | null;

  // Recalculate HOAI fee from stored params using the real domain logic
  const feeResult = useMemo(() => {
    if (!hoaiParams?.serviceType || !hoaiParams?.zone || !hoaiParams?.baseCosts) return null;

    const selectedPhases = (procurement?.groups ?? [])
      .filter((g: any) => g.groupType === 'hoai_phase' && g.isIncluded)
      .map((g: any) => g.phaseNumber)
      .filter((n: any): n is number => typeof n === 'number');

    if (selectedPhases.length === 0) return null;

    try {
      return calculateHoaiFee({
        serviceType: hoaiParams.serviceType as HoaiServiceType,
        zone: hoaiParams.zone as HoaiZone,
        eligibleCosts: hoaiParams.baseCosts,
        phases: selectedPhases,
        conversionFactor: hoaiParams.conversionFactor ?? 1.0,
        nebenkostenPercent: procurement?.nebenkostenPercent
          ? Number(procurement.nebenkostenPercent)
          : 0,
        coordinationFactor: hoaiParams.coordinationFactor ?? 1.0,
      });
    } catch {
      return null;
    }
  }, [hoaiParams, procurement]);

  // Phase groups from the procurement
  const phaseGroups = useMemo(() => {
    if (!procurement?.groups) return [];
    return (procurement.groups as any[])
      .filter((g) => g.groupType === 'hoai_phase')
      .sort((a, b) => (a.phaseNumber ?? 0) - (b.phaseNumber ?? 0));
  }, [procurement]);

  const handleSend = async () => {
    setSendingAction('send');
    try {
      await sendMutation.mutateAsync({ id });
      utils.procurement.getById.invalidate({ id });
    } catch {
      // error handled by mutation
    } finally {
      setSendingAction(null);
    }
  };

  const handleAccept = async () => {
    setSendingAction('accept');
    try {
      await acceptMutation.mutateAsync({ id });
      utils.procurement.getById.invalidate({ id });
    } catch {
      // error handled by mutation
    } finally {
      setSendingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !procurement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hoai">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fehler</h1>
            <p className="text-destructive">{error?.message ?? 'Angebot nicht gefunden'}</p>
          </div>
        </div>
      </div>
    );
  }

  const midFee = feeResult
    ? (feeResult.totalNetMin + feeResult.totalNetMax) / 2
    : Number(procurement.totalValueNet ?? 0);

  const displayStatus = statusApiToDisplay[procurement.status ?? 'draft'] ?? procurement.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hoai">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {procurement.number ?? `#${procurement.id}`}
            </h1>
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(procurement.status)}`}
            >
              {displayStatus}
            </span>
            {procurement.version && (
              <Badge variant="outline">Version {procurement.version}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {procurement.title} &middot; {procurement.projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {procurement.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSend}
              disabled={sendingAction !== null}
            >
              {sendingAction === 'send' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Senden
            </Button>
          )}
          {procurement.status === 'sent' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAccept}
              disabled={sendingAction !== null}
            >
              {sendingAction === 'accept' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Annehmen
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="uebersicht">
        <TabsList>
          <TabsTrigger value="uebersicht">Uebersicht</TabsTrigger>
          <TabsTrigger value="leistungsphasen">Leistungsphasen</TabsTrigger>
          <TabsTrigger value="positionen">Positionen</TabsTrigger>
          <TabsTrigger value="vorschau">Vorschau</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="uebersicht" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Auftraggeber</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Firma</span>
                  <span className="font-medium">{procurement.clientName ?? '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Projekt</span>
                  <span className="font-medium">{procurement.projectName}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>HOAI Parameter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hoaiParams ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leistungsbild</span>
                      <span className="font-medium">
                        {hoaiParams.serviceType ?? '---'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Honorarzone</span>
                      <span className="font-medium">
                        Zone {hoaiParams.zone ?? '---'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anrechenbare Kosten</span>
                      <span className="font-medium">
                        {hoaiParams.baseCosts ? formatCurrency(hoaiParams.baseCosts) : '---'}
                      </span>
                    </div>
                    {feeResult && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Honorarrahmen</span>
                        <span className="font-medium">
                          {formatCurrency(feeResult.feeMin)} &ndash; {formatCurrency(feeResult.feeMax)}
                        </span>
                      </div>
                    )}
                    {hoaiParams.conversionFactor && hoaiParams.conversionFactor !== 1 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Umbauzuschlag</span>
                        <span className="font-medium">
                          {hoaiParams.conversionFactor.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine HOAI-Parameter hinterlegt</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zusammenfassung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Erstellt am</span>
                  <span className="font-medium">{formatDate(procurement.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gueltig bis</span>
                  <span className="font-medium">{formatDate(procurement.validUntil)}</span>
                </div>
                {procurement.nebenkostenPercent && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nebenkosten</span>
                    <span className="font-medium">{procurement.nebenkostenPercent}%</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Gesamthonorar (netto)</span>
                  <span className="text-primary">
                    {formatCurrency(midFee)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle>Honorar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feeResult ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Honorar (min)</span>
                      <span className="font-medium">{formatCurrency(feeResult.totalNetMin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Honorar (max)</span>
                      <span className="font-medium">{formatCurrency(feeResult.totalNetMax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Mittelsatz (netto)</span>
                      <span className="text-primary">{formatCurrency(midFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>zzgl. 19% MwSt.</span>
                      <span>{formatCurrency(midFee * 0.19)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Brutto</span>
                      <span>{formatCurrency(midFee * 1.19)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Netto</span>
                      <span className="text-primary">{formatCurrency(midFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>zzgl. 19% MwSt.</span>
                      <span>{formatCurrency(midFee * 0.19)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Brutto</span>
                      <span>{formatCurrency(midFee * 1.19)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leistungsphasen Tab */}
        <TabsContent value="leistungsphasen">
          <Card>
            <CardHeader>
              <CardTitle>Leistungsphasen LP 1 &ndash; LP 9</CardTitle>
              <CardDescription>
                Prozentsaetze und Honorar je Leistungsphase nach HOAI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-3 text-left font-medium">Phase</th>
                      <th className="pb-3 text-left font-medium">Bezeichnung</th>
                      <th className="pb-3 text-right font-medium">%</th>
                      <th className="pb-3 text-right font-medium">Honorar (min)</th>
                      <th className="pb-3 text-right font-medium">Honorar (max)</th>
                      <th className="pb-3 text-center font-medium">Enthalten</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {phaseGroups.map((group: any) => {
                      const phaseBreakdown = feeResult?.feeByPhase.find(
                        (b) => b.phase === group.phaseNumber,
                      );
                      return (
                        <tr
                          key={group.id}
                          className={`transition-colors ${group.isIncluded ? '' : 'opacity-40'}`}
                        >
                          <td className="py-3 font-medium">LP {group.phaseNumber}</td>
                          <td className="py-3">{group.name}</td>
                          <td className="py-3 text-right">
                            {group.percentageBasic ? `${group.percentageBasic}%` : '---'}
                          </td>
                          <td className="py-3 text-right font-medium">
                            {phaseBreakdown ? formatCurrency(phaseBreakdown.feeMin) : '---'}
                          </td>
                          <td className="py-3 text-right font-medium">
                            {phaseBreakdown ? formatCurrency(phaseBreakdown.feeMax) : '---'}
                          </td>
                          <td className="py-3 text-center">
                            {group.isIncluded ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="pt-3" colSpan={2}>Summe</td>
                      <td className="pt-3 text-right">
                        {feeResult ? `${feeResult.phasePercentageTotal}%` : '---'}
                      </td>
                      <td className="pt-3 text-right text-primary">
                        {feeResult ? formatCurrency(feeResult.totalFeeMin) : '---'}
                      </td>
                      <td className="pt-3 text-right text-primary">
                        {feeResult ? formatCurrency(feeResult.totalFeeMax) : '---'}
                      </td>
                      <td className="pt-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Positionen Tab */}
        <TabsContent value="positionen" className="space-y-6">
          {procurement.positions && (procurement.positions as any[]).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Positionen</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 text-left font-medium w-12">Pos</th>
                      <th className="pb-2 text-left font-medium">Bezeichnung</th>
                      <th className="pb-2 text-right font-medium w-20">Menge</th>
                      <th className="pb-2 text-center font-medium w-20">Einheit</th>
                      <th className="pb-2 text-right font-medium w-28">EP</th>
                      <th className="pb-2 text-right font-medium w-28">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(procurement.positions as any[]).map((pos, index) => (
                      <tr key={pos.id} className="hover:bg-muted/50">
                        <td className="py-2 text-muted-foreground">
                          {pos.positionNumber ?? index + 1}
                        </td>
                        <td className="py-2">{pos.shortText}</td>
                        <td className="py-2 text-right">{pos.quantity ?? '---'}</td>
                        <td className="py-2 text-center text-muted-foreground">
                          {pos.unit ?? ''}
                        </td>
                        <td className="py-2 text-right">
                          {pos.unitPrice ? formatCurrency(Number(pos.unitPrice)) : '---'}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {pos.totalNet ? formatCurrency(Number(pos.totalNet)) : '---'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Keine Positionen vorhanden
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vorschau Tab */}
        <TabsContent value="vorschau">
          <Card>
            <CardContent className="p-8">
              <div className="mx-auto max-w-3xl space-y-8">
                {/* Document header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">Unternehmen</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">HONORARANGEBOT</p>
                    <p className="text-sm text-muted-foreground">
                      {procurement.number ?? `#${procurement.id}`}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Recipient */}
                {procurement.clientName && (
                  <div>
                    <p className="font-medium">{procurement.clientName}</p>
                  </div>
                )}

                <div className="text-right text-sm text-muted-foreground">
                  {formatDate(procurement.createdAt)}
                </div>

                {/* Subject */}
                <div>
                  <p className="font-bold">Betreff: {procurement.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Projekt: {procurement.projectName}
                  </p>
                </div>

                {/* HOAI details */}
                {hoaiParams?.baseCosts && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="font-semibold">Grundlagen der Honorarermittlung:</p>
                    <p>Honorarzone: {hoaiParams.zone}</p>
                    <p>
                      Anrechenbare Kosten: {formatCurrency(hoaiParams.baseCosts)} (netto)
                    </p>
                    <p>
                      Leistungsphasen: LP{' '}
                      {phaseGroups
                        .filter((g: any) => g.isIncluded)
                        .map((g: any) => g.phaseNumber)
                        .join(', LP ')}
                    </p>
                  </div>
                )}

                {/* Fee table */}
                {feeResult && (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium">Leistungsphase</th>
                        <th className="py-2 text-right font-medium">Honorar (Mittelsatz)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {feeResult.feeByPhase.map((phase) => (
                        <tr key={phase.phase}>
                          <td className="py-1.5">
                            LP {phase.phase} &ndash; {phase.name}
                          </td>
                          <td className="py-1.5 text-right">
                            {formatCurrency((phase.feeMin + phase.feeMax) / 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-2">Gesamthonorar (netto)</td>
                        <td className="py-2 text-right">{formatCurrency(midFee)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">zzgl. 19% MwSt.</td>
                        <td className="py-1 text-right">{formatCurrency(midFee * 0.19)}</td>
                      </tr>
                      <tr className="font-bold">
                        <td className="py-2">Gesamthonorar (brutto)</td>
                        <td className="py-2 text-right">{formatCurrency(midFee * 1.19)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {procurement.validUntil && (
                  <p className="text-sm">
                    Dieses Angebot ist gueltig bis zum {formatDate(procurement.validUntil)}.
                  </p>
                )}

                <p className="mt-8 text-sm">Mit freundlichen Gruessen</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
