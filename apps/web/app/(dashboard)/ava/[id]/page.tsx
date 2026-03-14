'use client';

import { trpc } from '@/lib/trpc';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Skeleton,
} from '@vambiant/ui';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clipboard,
  ClipboardList,
  FileCheck,
  Gavel,
  Loader2,
  Plus,
  Send,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Veroeffentlicht',
  published: 'Veroeffentlicht',
  bidding: 'Bieterphase',
  evaluation: 'Auswertung',
  awarded: 'Vergeben',
  executed: 'Ausgefuehrt',
  cancelled: 'Storniert',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'sent':
    case 'published':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'bidding':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
    case 'evaluation':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'awarded':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'executed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

const vergabeartLabels: Record<string, string> = {
  offen: 'Offenes Verfahren',
  beschraenkt: 'Beschraenkte Ausschreibung',
  freihaendig: 'Freihaendige Vergabe',
};

const contractTypeLabels: Record<string, string> = {
  vob_b: 'VOB/B',
  vob_a: 'VOB/A',
  bgb: 'BGB-Bauvertrag',
};

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

function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type TabId = 'uebersicht' | 'lv' | 'bieter' | 'vergabe';

export default function AVADetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [activeTab, setActiveTab] = useState<TabId>('uebersicht');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // New position form state
  const [newPosShortText, setNewPosShortText] = useState('');
  const [newPosUnit, setNewPosUnit] = useState('');
  const [newPosQuantity, setNewPosQuantity] = useState('');
  const [newPosUnitPrice, setNewPosUnitPrice] = useState('');
  const [addingPosition, setAddingPosition] = useState(false);

  const utils = trpc.useUtils();

  const {
    data: tender,
    isLoading,
    error,
  } = trpc.procurement.getById.useQuery({ id }, { enabled: id > 0 });

  const sendMutation = trpc.procurement.send.useMutation({
    onSuccess: () => {
      utils.procurement.getById.invalidate({ id });
      utils.procurement.list.invalidate();
    },
  });

  const createPositionMutation = trpc.procurement.positions.create.useMutation({
    onSuccess: () => {
      utils.procurement.getById.invalidate({ id });
      setNewPosShortText('');
      setNewPosUnit('');
      setNewPosQuantity('');
      setNewPosUnitPrice('');
      setAddingPosition(false);
    },
  });

  const avaParams = useMemo(() => {
    if (!tender?.avaParams) return null;
    return tender.avaParams as {
      vergabeart?: string;
      contractType?: string;
      submissionDeadline?: string;
      executionStart?: string;
      executionEnd?: string;
    } | null;
  }, [tender]);

  // Status transition logic
  // The backend `send` mutation transitions draft -> sent. For AVA context,
  // 'sent' is displayed as 'Veroeffentlicht'. Further transitions (bidding,
  // evaluation, awarded, executed) would require a dedicated backend mutation.
  const nextStatusAction = useMemo(() => {
    if (!tender) return null;
    const effectiveStatus = tender.status === 'sent' ? 'published' : tender.status;
    switch (effectiveStatus) {
      case 'draft':
        return { label: 'Veroeffentlichen', nextStatus: 'published', icon: Send };
      case 'published':
        return { label: 'Bieterphase starten', nextStatus: 'bidding', icon: Users };
      case 'bidding':
        return { label: 'Auswertung starten', nextStatus: 'evaluation', icon: FileCheck };
      case 'evaluation':
        return { label: 'Vergabe abschliessen', nextStatus: 'awarded', icon: Gavel };
      case 'awarded':
        return { label: 'Als ausgefuehrt markieren', nextStatus: 'executed', icon: Clipboard };
      default:
        return null;
    }
  }, [tender]);

  const handleStatusTransition = async () => {
    if (!tender || !nextStatusAction) return;
    setStatusUpdating(true);
    try {
      if (tender.status === 'draft') {
        // Use the send mutation which transitions draft -> sent.
        // For AVA context, 'sent' is displayed as 'Veroeffentlicht'.
        await sendMutation.mutateAsync({ id: tender.id });
      }
      // Further transitions (bidding, evaluation, awarded, executed)
      // would require a dedicated backend mutation (e.g. procurement.transitionStatus).
    } catch {
      // Error is available via sendMutation.error
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddPosition = async () => {
    if (!tender || !newPosShortText) return;
    try {
      await createPositionMutation.mutateAsync({
        procurementId: tender.id,
        shortText: newPosShortText,
        unit: newPosUnit || undefined,
        quantity: newPosQuantity ? Number.parseFloat(newPosQuantity) : undefined,
        unitPrice: newPosUnitPrice ? Number.parseFloat(newPosUnitPrice) : undefined,
      });
    } catch {
      // Error shown via mutation state
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ava">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Fehler</h1>
        </div>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error?.message ?? 'Ausschreibung nicht gefunden'}
        </div>
      </div>
    );
  }

  const positions = tender.positions ?? [];
  const bidsList = tender.bids ?? [];
  const groups = tender.groups ?? [];

  const totalNet = positions.reduce((sum, p) => sum + Number.parseFloat(p.totalNet ?? '0'), 0);

  // Compute deadline info
  const submissionDeadline = avaParams?.submissionDeadline
    ? new Date(avaParams.submissionDeadline)
    : null;
  const daysLeft = submissionDeadline
    ? Math.ceil((submissionDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Map 'sent' status to 'published' display for AVA context
  const displayStatus = tender.status === 'sent' ? 'published' : (tender.status ?? 'draft');

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'uebersicht', label: 'Uebersicht', icon: Clipboard },
    { id: 'lv', label: `Leistungsverzeichnis (${positions.length})`, icon: ClipboardList },
    { id: 'bieter', label: `Bieter (${bidsList.length})`, icon: Users },
    { id: 'vergabe', label: 'Vergabe', icon: Gavel },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ava" className="hover:text-foreground">
          AVA
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{tender.number ?? `#${tender.id}`}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link href="/ava">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{tender.title}</h1>
              <p className="text-muted-foreground">{tender.projectName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {tender.number ?? `#${tender.id}`}
            </span>
            {avaParams?.vergabeart && (
              <span className="inline-flex rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                {vergabeartLabels[avaParams.vergabeart] ?? avaParams.vergabeart}
              </span>
            )}
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(displayStatus)}`}
            >
              {statusApiToDisplay[displayStatus] ?? displayStatus}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {submissionDeadline && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Frist: {formatDateTime(submissionDeadline)}</span>
              {daysLeft !== null && (
                <span
                  className={`ml-1 inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                    daysLeft > 14
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : daysLeft > 7
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {daysLeft > 0 ? `${daysLeft} Tage` : 'Abgelaufen'}
                </span>
              )}
            </div>
          )}
          {nextStatusAction && displayStatus === 'draft' && (
            <Button onClick={handleStatusTransition} disabled={statusUpdating} size="sm">
              {statusUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <nextStatusAction.icon className="h-4 w-4" />
              )}
              {nextStatusAction.label}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Positionen</p>
          <p className="mt-1 text-2xl font-bold">{positions.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Lose</p>
          <p className="mt-1 text-2xl font-bold">
            {groups.filter((g) => g.groupType === 'ava_lot').length || '---'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Bieter</p>
          <p className="mt-1 text-2xl font-bold">{bidsList.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Summe (netto)</p>
          <p className="mt-1 text-lg font-bold">
            {totalNet > 0
              ? formatCurrency(totalNet)
              : tender.totalValueNet
                ? formatCurrency(Number.parseFloat(tender.totalValueNet))
                : '---'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'uebersicht' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Beschreibung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {tender.description || 'Keine Beschreibung vorhanden.'}
              </p>
            </CardContent>
          </Card>

          {/* Vergabeparameter */}
          <Card>
            <CardHeader>
              <CardTitle>Vergabeparameter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vergabeart</span>
                <span className="font-medium">
                  {avaParams?.vergabeart
                    ? (vergabeartLabels[avaParams.vergabeart] ?? avaParams.vergabeart)
                    : '---'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vertragstyp</span>
                <span className="font-medium">
                  {avaParams?.contractType
                    ? (contractTypeLabels[avaParams.contractType] ?? avaParams.contractType)
                    : '---'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Abgabefrist</span>
                <span className="font-medium">{formatDateTime(avaParams?.submissionDeadline)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ausfuehrung</span>
                <span className="font-medium">
                  {formatDate(avaParams?.executionStart)} &ndash;{' '}
                  {formatDate(avaParams?.executionEnd)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Schaetzsumme</span>
                <span className="font-medium">
                  {tender.totalValueNet
                    ? formatCurrency(Number.parseFloat(tender.totalValueNet))
                    : '---'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline / Status Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Zeitverlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Erstellt:</span>{' '}
                  <span className="font-medium">{formatDate(tender.createdAt)}</span>
                </div>
                {tender.sentAt && (
                  <div>
                    <span className="text-muted-foreground">Veroeffentlicht:</span>{' '}
                    <span className="font-medium">{formatDate(tender.sentAt)}</span>
                  </div>
                )}
                {tender.acceptedAt && (
                  <div>
                    <span className="text-muted-foreground">Vergeben:</span>{' '}
                    <span className="font-medium">{formatDate(tender.acceptedAt)}</span>
                  </div>
                )}
              </div>
              {tender.notes && (
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">Bemerkungen:</span>
                  <p className="mt-1 text-sm">{tender.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'lv' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leistungsverzeichnis</CardTitle>
                  <CardDescription>{positions.length} Positionen</CardDescription>
                </div>
                {!tender.isLocked && (
                  <Button variant="outline" size="sm" onClick={() => setAddingPosition(true)}>
                    <Plus className="h-4 w-4" />
                    Position hinzufuegen
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {positions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="pb-2 text-left font-medium w-16">Nr.</th>
                        <th className="pb-2 text-left font-medium">Kurztext</th>
                        <th className="pb-2 text-right font-medium w-16">Einheit</th>
                        <th className="pb-2 text-right font-medium w-24">Menge</th>
                        <th className="pb-2 text-right font-medium w-28">EP (netto)</th>
                        <th className="pb-2 text-right font-medium w-28">GP (netto)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {positions.map((pos, idx) => (
                        <tr key={pos.id} className="hover:bg-muted/50">
                          <td className="py-2 font-mono text-xs">
                            {pos.positionNumber ?? idx + 1}
                          </td>
                          <td className="py-2">{pos.shortText}</td>
                          <td className="py-2 text-right text-muted-foreground">
                            {pos.unit ?? '---'}
                          </td>
                          <td className="py-2 text-right">
                            {pos.quantity
                              ? Number.parseFloat(pos.quantity).toLocaleString('de-DE')
                              : '---'}
                          </td>
                          <td className="py-2 text-right">
                            {pos.unitPrice
                              ? formatCurrency(Number.parseFloat(pos.unitPrice))
                              : '---'}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {pos.totalNet ? formatCurrency(Number.parseFloat(pos.totalNet)) : '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="pt-3" colSpan={5}>
                          Gesamtsumme (netto)
                        </td>
                        <td className="pt-3 text-right">{formatCurrency(totalNet)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Noch keine Positionen vorhanden
                  </p>
                  {!tender.isLocked && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setAddingPosition(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Erste Position hinzufuegen
                    </Button>
                  )}
                </div>
              )}

              {/* Add Position Form */}
              {addingPosition && (
                <>
                  <Separator className="my-4" />
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <h4 className="text-sm font-medium">Neue Position</h4>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs">Kurztext *</Label>
                        <Input
                          placeholder="Beschreibung der Position..."
                          value={newPosShortText}
                          onChange={(e) => setNewPosShortText(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Einheit</Label>
                        <Input
                          placeholder="z.B. m2, Stk"
                          value={newPosUnit}
                          onChange={(e) => setNewPosUnit(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Menge</Label>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0"
                          value={newPosQuantity}
                          onChange={(e) => setNewPosQuantity(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Einheitspreis (netto)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newPosUnitPrice}
                          onChange={(e) => setNewPosUnitPrice(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddPosition}
                        disabled={!newPosShortText || createPositionMutation.isPending}
                      >
                        {createPositionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Hinzufuegen
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingPosition(false)}>
                        Abbrechen
                      </Button>
                    </div>
                    {createPositionMutation.isError && (
                      <p className="text-xs text-destructive">
                        {createPositionMutation.error.message}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'bieter' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bieter / Angebote</CardTitle>
              <CardDescription>{bidsList.length} Angebote eingegangen</CardDescription>
            </CardHeader>
            <CardContent>
              {bidsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="pb-2 text-left font-medium">Bieter</th>
                        <th className="pb-2 text-left font-medium">Eingangsdatum</th>
                        <th className="pb-2 text-right font-medium">Angebotssumme (netto)</th>
                        <th className="pb-2 text-right font-medium">Angebotssumme (brutto)</th>
                        <th className="pb-2 text-left font-medium">Status</th>
                        <th className="pb-2 text-left font-medium">Entscheidung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bidsList.map((bid) => (
                        <tr key={bid.id} className="hover:bg-muted/50">
                          <td className="py-2 font-medium">{bid.bidderName}</td>
                          <td className="py-2 text-muted-foreground">
                            {formatDate(bid.submissionDate)}
                          </td>
                          <td className="py-2 text-right">
                            {bid.totalNet ? formatCurrency(Number.parseFloat(bid.totalNet)) : '---'}
                          </td>
                          <td className="py-2 text-right">
                            {bid.totalGross
                              ? formatCurrency(Number.parseFloat(bid.totalGross))
                              : '---'}
                          </td>
                          <td className="py-2">
                            <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                              {bid.status ?? '---'}
                            </span>
                          </td>
                          <td className="py-2">
                            {bid.decision ? (
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                                  bid.decision === 'awarded'
                                    ? 'bg-green-100 text-green-700'
                                    : bid.decision === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {bid.decision === 'awarded'
                                  ? 'Zuschlag'
                                  : bid.decision === 'rejected'
                                    ? 'Abgelehnt'
                                    : bid.decision}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">---</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Noch keine Angebote eingegangen
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'vergabe' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vergabestatus</CardTitle>
              <CardDescription>Aktueller Status und Statusuebergaenge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Pipeline */}
              <div className="flex flex-wrap items-center gap-2">
                {['draft', 'published', 'bidding', 'evaluation', 'awarded', 'executed'].map(
                  (status, idx, arr) => {
                    const isCurrent =
                      displayStatus === status ||
                      (displayStatus === 'sent' && status === 'published');
                    const isPast =
                      arr.indexOf(displayStatus === 'sent' ? 'published' : displayStatus) > idx;
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : isPast
                                ? 'bg-green-100 text-green-700'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {statusApiToDisplay[status] ?? status}
                        </div>
                        {idx < arr.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  },
                )}
              </div>

              <Separator />

              {/* Action buttons */}
              {nextStatusAction && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Naechster Schritt: {nextStatusAction.label}
                  </p>
                  <Button onClick={handleStatusTransition} disabled={statusUpdating}>
                    {statusUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <nextStatusAction.icon className="h-4 w-4" />
                    )}
                    {nextStatusAction.label}
                  </Button>
                </div>
              )}

              {displayStatus === 'awarded' && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Diese Ausschreibung wurde vergeben.
                  </p>
                  {tender.acceptedAt && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-500">
                      Vergeben am {formatDate(tender.acceptedAt)}
                    </p>
                  )}
                </div>
              )}

              {displayStatus === 'executed' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                    Diese Ausschreibung wurde erfolgreich ausgefuehrt.
                  </p>
                </div>
              )}

              {displayStatus === 'cancelled' && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    Diese Ausschreibung wurde storniert.
                  </p>
                  {tender.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-500">
                      Grund: {tender.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
