'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  Loader2,
  Pencil,
  Save,
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
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
  terminated: 'Gekündigt',
  suspended: 'Pausiert',
};

const contractTypeApiToDisplay: Record<string, string> = {
  service: 'Dienstleistung',
  construction: 'Bauleistung',
  consulting: 'Beratung',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'active':
    case 'Aktiv':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'draft':
    case 'Entwurf':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'completed':
    case 'Abgeschlossen':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'terminated':
    case 'Gekündigt':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'suspended':
    case 'Pausiert':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getInvoiceStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-700';
  }
}

const invoiceStatusDisplay: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
  partially_paid: 'Teilweise bezahlt',
};

function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
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

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const contractId = Number(params.id);
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTotalFeeNet, setEditTotalFeeNet] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const { data: contract, isLoading, error } = trpc.finance.contracts.getById.useQuery(
    { id: contractId },
    { enabled: !isNaN(contractId) && contractId > 0, retry: false },
  );

  const updateMutation = trpc.finance.contracts.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Vertrag aktualisiert', description: 'Änderungen wurden gespeichert.' });
      setIsEditing(false);
      utils.finance.contracts.getById.invalidate({ id: contractId });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.finance.contracts.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Vertrag gelöscht', description: 'Der Vertrag wurde erfolgreich gelöscht.' });
      router.push('/contracts');
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const startEditing = () => {
    if (!contract) return;
    setEditTitle(contract.title);
    setEditStatus(contract.status ?? 'draft');
    setEditDescription(contract.description ?? '');
    setEditTotalFeeNet(contract.totalFeeNet ? String(parseFloat(contract.totalFeeNet)) : '');
    setEditStartDate(contract.startDate ?? '');
    setEditEndDate(contract.plannedEndDate ?? '');
    setEditNotes(contract.notes ?? '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editTitle.trim()) {
      toast({ title: 'Fehler', description: 'Titel ist erforderlich.', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({
      id: contractId,
      title: editTitle.trim(),
      status: editStatus as 'draft' | 'active' | 'completed' | 'terminated' | 'suspended',
      description: editDescription || undefined,
      totalFeeNet: editTotalFeeNet ? parseFloat(editTotalFeeNet) : undefined,
      startDate: editStartDate ? new Date(editStartDate) : undefined,
      plannedEndDate: editEndDate ? new Date(editEndDate) : undefined,
      notes: editNotes || undefined,
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
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contracts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <p className="text-sm text-destructive">
            Vertrag konnte nicht geladen werden: {error?.message ?? 'Nicht gefunden'}
          </p>
        </div>
      </div>
    );
  }

  const totalFeeNet = parseFloat(contract.totalFeeNet ?? '0');
  const totalFeeGross = parseFloat(contract.totalFeeGross ?? '0');
  const invoicedNet = parseFloat(contract.financialSummary?.invoicedNet ?? '0');
  const paidNet = parseFloat(contract.financialSummary?.paidNet ?? '0');
  const remainingNet = parseFloat(contract.financialSummary?.remainingNet ?? '0');
  const invoicedPercent = totalFeeNet > 0 ? Math.round((invoicedNet / totalFeeNet) * 100) : 0;
  const paidPercent = totalFeeNet > 0 ? Math.round((paidNet / totalFeeNet) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contracts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {contract.number ?? `#${contract.id}`}
            </h1>
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(contract.status)}`}>
              {statusApiToDisplay[contract.status ?? 'draft'] ?? contract.status}
            </span>
          </div>
          <p className="text-muted-foreground">
            {contract.title} &middot; {contract.projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Speichern
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" /> Abbrechen
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4" /> Bearbeiten
              </Button>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vertrag löschen?</DialogTitle>
                    <DialogDescription>
                      Möchten Sie den Vertrag &quot;{contract.title}&quot; wirklich löschen?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
                    <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: contractId })} disabled={deleteMutation.isPending}>
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Löschen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
          <Card>
            <CardHeader><CardTitle className="text-base">Vertragsdaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="terminated">Gekündigt</SelectItem>
                    <SelectItem value="suspended">Pausiert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vertragssumme (netto)</Label>
                <Input type="number" step="0.01" value={editTotalFeeNet} onChange={(e) => setEditTotalFeeNet(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Beginn</Label>
                  <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ende</Label>
                  <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Beschreibung & Notizen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Parties & Details */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Projekt</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{contract.projectName}</p>
                <p className="text-muted-foreground">
                  Vertragsart: {contractTypeApiToDisplay[contract.contractType] ?? contract.contractType}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Auftragnehmer</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{contract.organizationName ?? '---'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Laufzeit</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beginn</span>
                  <span>{formatDate(contract.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vertragsende</span>
                  <span>{formatDate(contract.plannedEndDate)}</span>
                </div>
                {contract.signedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unterschrieben</span>
                    <span>{formatDate(contract.signedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finanzübersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vertragssumme (netto)</span>
                    <span className="font-medium">{formatCurrency(totalFeeNet)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vertragssumme (brutto)</span>
                    <span className="font-medium">{formatCurrency(totalFeeGross)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Abgerechnet</span>
                      <span>{formatCurrency(invoicedNet)} ({invoicedPercent}%)</span>
                    </div>
                    <Progress value={invoicedPercent} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Bezahlt</span>
                      <span>{formatCurrency(paidNet)} ({paidPercent}%)</span>
                    </div>
                    <Progress value={paidPercent} />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Noch abzurechnen</span>
                    <span className="font-medium">{formatCurrency(remainingNet)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Offene Zahlungen</span>
                    <span className="font-medium">{formatCurrency(invoicedNet - paidNet)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="uebersicht">
            <TabsList>
              <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
              <TabsTrigger value="rechnungen">
                Rechnungen ({contract.invoices?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
            </TabsList>

            <TabsContent value="uebersicht">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4 text-sm">
                    {contract.description ? (
                      <p className="whitespace-pre-wrap">{contract.description}</p>
                    ) : (
                      <p className="text-muted-foreground">Keine Beschreibung vorhanden.</p>
                    )}
                    {contract.notes && (
                      <>
                        <Separator />
                        <div>
                          <p className="font-semibold mb-1">Notizen</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{contract.notes}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rechnungen">
              <Card>
                <CardContent className="p-0">
                  {(!contract.invoices || contract.invoices.length === 0) ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Keine Rechnungen vorhanden
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nr</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Typ</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Betrag (netto)</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Datum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {contract.invoices.map((inv: any) => (
                            <tr key={inv.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 font-mono">
                                <Link href={`/invoices/${inv.id}`} className="hover:underline">
                                  {inv.invoiceNumber}
                                </Link>
                              </td>
                              <td className="px-4 py-3">{inv.type ?? 'standard'}</td>
                              <td className="px-4 py-3 text-right font-medium">
                                {formatCurrency(inv.amountNet)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getInvoiceStatusColor(inv.status)}`}>
                                  {invoiceStatusDisplay[inv.status ?? 'draft'] ?? inv.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatDate(inv.invoiceDate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dokumente">
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Noch keine Dokumente vorhanden
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Dokument hochladen
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
