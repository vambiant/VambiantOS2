'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Mail,
  Pencil,
  Printer,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Textarea,
  useToast,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
  partially_paid: 'Teilweise bezahlt',
};

const invoiceTypeDisplay: Record<string, string> = {
  standard: 'Rechnung',
  partial: 'Abschlagsrechnung',
  final: 'Schlussrechnung',
  credit_note: 'Gutschrift',
  advance: 'Vorschussrechnung',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'sent':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'cancelled':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    case 'partially_paid':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const invoiceId = Number(params.id);
  const utils = trpc.useUtils();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0] ?? '');

  const { data: invoice, isLoading, error } = trpc.finance.invoices.getById.useQuery(
    { id: invoiceId },
    { enabled: !isNaN(invoiceId) && invoiceId > 0, retry: false },
  );

  const sendMutation = trpc.finance.invoices.send.useMutation({
    onSuccess: () => {
      toast({ title: 'Rechnung versendet', description: 'Status wurde auf "Gesendet" geändert.' });
      utils.finance.invoices.getById.invalidate({ id: invoiceId });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const markPaidMutation = trpc.finance.invoices.markPaid.useMutation({
    onSuccess: () => {
      toast({ title: 'Zahlung erfasst', description: 'Die Rechnung wurde als bezahlt markiert.' });
      setMarkPaidDialogOpen(false);
      utils.finance.invoices.getById.invalidate({ id: invoiceId });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.finance.invoices.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Rechnung gelöscht', description: 'Die Rechnung wurde erfolgreich gelöscht.' });
      router.push('/invoices');
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const handleMarkPaid = () => {
    if (!paidAmount || !paidDate) {
      toast({ title: 'Fehler', description: 'Bitte Betrag und Datum angeben.', variant: 'destructive' });
      return;
    }
    markPaidMutation.mutate({
      id: invoiceId,
      paidAmount: parseFloat(paidAmount),
      paidAt: new Date(paidDate),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/invoices"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <p className="text-sm text-destructive">
            Rechnung konnte nicht geladen werden: {error?.message ?? 'Nicht gefunden'}
          </p>
        </div>
      </div>
    );
  }

  const lineItemsArr = (invoice.lineItems as any[]) ?? [];
  const subtotal = lineItemsArr.reduce((s: number, item: any) => s + (item.total ?? (item.qty ?? 1) * (item.unitPrice ?? 0)), 0);
  const amountNet = parseFloat(invoice.amountNet ?? '0') || subtotal;
  const amountVat = parseFloat(invoice.amountVat ?? '0') || amountNet * 0.19;
  const amountGross = parseFloat(invoice.amountGross ?? '0') || amountNet + amountVat;
  const paidAmountVal = parseFloat(invoice.paidAmount ?? '0');
  const openAmount = amountGross - paidAmountVal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {invoice.invoiceNumber}
            </h1>
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(invoice.status)}`}>
              {invoice.status === 'overdue' && <AlertTriangle className="h-3 w-3" />}
              {statusApiToDisplay[invoice.status ?? 'draft'] ?? invoice.status}
            </span>
          </div>
          <p className="text-muted-foreground">
            {invoice.projectName ?? '---'} {invoice.contractNumber ? `\u00b7 Vertrag ${invoice.contractNumber}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => sendMutation.mutate({ id: invoiceId })} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Senden
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partially_paid') && (
            <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => {
                  setPaidAmount(String(amountGross));
                  setPaidDate(new Date().toISOString().split('T')[0] ?? '');
                }}>
                  <Check className="h-4 w-4" />
                  Als bezahlt markieren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Zahlung erfassen</DialogTitle>
                  <DialogDescription>
                    Rechnungsbetrag: {formatCurrency(amountGross)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Bezahlter Betrag</Label>
                    <Input type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Zahlungsdatum</Label>
                    <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMarkPaidDialogOpen(false)}>Abbrechen</Button>
                  <Button onClick={handleMarkPaid} disabled={markPaidMutation.isPending}>
                    {markPaidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Zahlung erfassen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rechnung löschen?</DialogTitle>
                <DialogDescription>
                  Möchten Sie die Rechnung &quot;{invoice.invoiceNumber}&quot; wirklich löschen?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: invoiceId })} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Löschen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invoice Info Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Rechnungsdetails</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rechnungsnummer</span>
              <span className="font-mono">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Typ</span>
              <span>{invoiceTypeDisplay[invoice.type ?? 'standard'] ?? invoice.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Richtung</span>
              <span>{invoice.direction === 'outbound' ? 'Ausgang' : 'Eingang'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rechnungsdatum</span>
              <span>{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fälligkeitsdatum</span>
              <span>{formatDate(invoice.dueDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Empfänger</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{invoice.organizationName ?? '---'}</p>
            {invoice.projectName && (
              <p className="text-muted-foreground">Projekt: {invoice.projectName}</p>
            )}
            {invoice.contractNumber && (
              <p className="text-muted-foreground">Vertrag: {invoice.contractNumber}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Zahlungsstatus</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rechnungsbetrag</span>
              <span className="font-medium">{formatCurrency(amountGross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bereits gezahlt</span>
              <span className="font-medium text-green-600">{formatCurrency(paidAmountVal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Offener Betrag</span>
              <span className={openAmount > 0 ? 'text-primary' : 'text-green-600'}>
                {formatCurrency(openAmount)}
              </span>
            </div>
            {invoice.paidAt && (
              <p className="text-xs text-muted-foreground">
                Bezahlt am {formatDate(invoice.paidAt)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Document */}
      <Card>
        <CardContent className="p-8">
          <div className="mx-auto max-w-3xl space-y-8">
            {/* Invoice Header */}
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold">RECHNUNG</h2>
                <p className="text-sm text-muted-foreground">
                  Rechnungsnummer: {invoice.invoiceNumber}
                </p>
              </div>
              <div className="text-right text-sm">
                <div className="flex justify-between gap-8">
                  <span className="text-muted-foreground">Rechnungsdatum:</span>
                  <span>{formatDate(invoice.invoiceDate)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-muted-foreground">Fälligkeitsdatum:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            {lineItemsArr.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium w-12">Pos</th>
                    <th className="pb-2 text-left font-medium">Beschreibung</th>
                    <th className="pb-2 text-right font-medium w-16">Menge</th>
                    <th className="pb-2 text-right font-medium w-28">Einzelpreis</th>
                    <th className="pb-2 text-right font-medium w-28">Gesamt</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lineItemsArr.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="py-2 text-muted-foreground">{index + 1}</td>
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right">{item.qty ?? 1}</td>
                      <td className="py-2 text-right">
                        {formatCurrency(item.unitPrice ?? 0)}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(item.total ?? (item.qty ?? 1) * (item.unitPrice ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Positionen vorhanden.</p>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zwischensumme (netto)</span>
                  <span>{formatCurrency(amountNet)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Umsatzsteuer (19%)</span>
                  <span>{formatCurrency(amountVat)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Gesamtbetrag</span>
                  <span className="text-primary">{formatCurrency(amountGross)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="rounded-lg border p-4 text-sm">
                <p className="font-semibold mb-1">Bemerkungen</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
