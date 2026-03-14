'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

interface LineItem {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [projectId, setProjectId] = useState('');
  const [contractId, setContractId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [dueDate, setDueDate] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceType, setInvoiceType] = useState('standard');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: '', quantity: 1, unit: 'psch', unitPrice: 0 },
  ]);

  // Fetch projects
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  // Fetch contracts
  const { data: contractsData, isLoading: contractsLoading } = trpc.finance.contracts.list.useQuery({
    projectId: projectId ? parseInt(projectId) : undefined,
    page: 1,
    pageSize: 100,
  });

  // Fetch organizations (clients)
  const { data: orgsData } = trpc.crm.organizations.list.useQuery({
    type: 'client',
    page: 1,
    pageSize: 100,
  });

  const createMutation = trpc.finance.invoices.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Rechnung erstellt',
        description: `Rechnung ${data.invoiceNumber} wurde erfolgreich erstellt.`,
      });
      router.push(`/invoices/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Fehler beim Erstellen',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addLineItem = () => {
    const newId = Math.max(...lineItems.map((li) => li.id), 0) + 1;
    setLineItems((prev) => [
      ...prev,
      { id: newId, description: '', quantity: 1, unit: 'psch', unitPrice: 0 },
    ]);
  };

  const removeLineItem = (id: number) => {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  };

  const updateLineItem = (id: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)),
    );
  };

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice,
    0,
  );
  const vat = subtotal * 0.19;
  const total = subtotal + vat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceDate) {
      toast({ title: 'Fehlende Pflichtfelder', description: 'Rechnungsdatum ist erforderlich.', variant: 'destructive' });
      return;
    }

    // Generate invoice number
    const now = new Date();
    const invoiceNumber = `RE-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    createMutation.mutate({
      projectId: projectId ? parseInt(projectId) : undefined,
      contractId: contractId ? parseInt(contractId) : undefined,
      organizationId: organizationId ? parseInt(organizationId) : undefined,
      direction: 'outbound',
      invoiceNumber,
      type: invoiceType as 'standard' | 'partial' | 'final' | 'credit_note' | 'advance',
      status: 'draft',
      invoiceDate: new Date(invoiceDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      amountNet: subtotal > 0 ? subtotal : undefined,
      amountVat: vat > 0 ? vat : undefined,
      amountGross: total > 0 ? total : undefined,
      lineItems: lineItems
        .filter((li) => li.description.trim())
        .map((li) => ({
          description: li.description,
          qty: li.quantity,
          unitPrice: li.unitPrice,
          taxRate: 19,
          total: li.quantity * li.unitPrice,
        })),
      notes: [subject, notes].filter(Boolean).join('\n') || undefined,
    });
  };

  const projects = projectsData?.items ?? [];
  const contractsList = contractsData?.items ?? [];
  const organizations = orgsData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neue Rechnung</h1>
          <p className="text-muted-foreground">
            Erstellen Sie eine neue Ausgangsrechnung
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Rechnungsdaten</CardTitle>
            <CardDescription>
              Grunddaten der Rechnung festlegen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Projekt</Label>
                {projectsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Projekt auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Vertrag</Label>
                {contractsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={contractId} onValueChange={setContractId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vertrag auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contractsList.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.number ?? `#${c.id}`} - {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Empfänger</Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Empfänger auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((o: any) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rechnungstyp</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Rechnung</SelectItem>
                    <SelectItem value="partial">Abschlagsrechnung</SelectItem>
                    <SelectItem value="final">Schlussrechnung</SelectItem>
                    <SelectItem value="advance">Vorschussrechnung</SelectItem>
                    <SelectItem value="credit_note">Gutschrift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                placeholder="z.B. 2. Abschlagsrechnung LP 2-3"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice-date">Rechnungsdatum *</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Fälligkeitsdatum</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Positionen</CardTitle>
            <CardDescription>
              Rechnungspositionen hinzufügen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 text-left font-medium w-12">Pos</th>
                  <th className="pb-2 text-left font-medium">Beschreibung</th>
                  <th className="pb-2 text-right font-medium w-20">Menge</th>
                  <th className="pb-2 text-center font-medium w-24">Einheit</th>
                  <th className="pb-2 text-right font-medium w-28">EP (EUR)</th>
                  <th className="pb-2 text-right font-medium w-28">Gesamt</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {lineItems.map((li, index) => (
                  <tr key={li.id}>
                    <td className="py-2 text-muted-foreground">{index + 1}</td>
                    <td className="py-2">
                      <Input
                        value={li.description}
                        onChange={(e) =>
                          updateLineItem(li.id, 'description', e.target.value)
                        }
                        placeholder="Leistungsbeschreibung..."
                        className="h-8"
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        type="number"
                        value={li.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            li.id,
                            'quantity',
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-8 w-20 text-right"
                      />
                    </td>
                    <td className="py-2">
                      <Select
                        value={li.unit}
                        onValueChange={(v) => updateLineItem(li.id, 'unit', v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="psch">psch</SelectItem>
                          <SelectItem value="St">St</SelectItem>
                          <SelectItem value="Std">Std</SelectItem>
                          <SelectItem value="m²">m&#178;</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={li.unitPrice}
                        onChange={(e) =>
                          updateLineItem(
                            li.id,
                            'unitPrice',
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-8 w-28 text-right"
                      />
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(li.quantity * li.unitPrice)}
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(li.id)}
                        className="h-8 w-8 text-destructive"
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="h-4 w-4" />
              Position hinzufügen
            </Button>

            <Separator />

            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zwischensumme (netto)</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MwSt. 19%</span>
                  <span className="font-medium">{formatCurrency(vat)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Gesamtbetrag</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle>Notizen</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              placeholder="Interne Notizen zur Rechnung..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Rechnung erstellen
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/invoices">Abbrechen</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
