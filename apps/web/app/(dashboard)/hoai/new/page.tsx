'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
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
  Textarea,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';
import { HoaiCalculator, type HoaiCalculatorState } from '@/components/hoai/hoai-calculator';

const steps = [
  { nr: 1, title: 'Projekt & Auftraggeber' },
  { nr: 2, title: 'HOAI Parameter' },
  { nr: 3, title: 'Zusaetzliche Positionen' },
  { nr: 4, title: 'Zusammenfassung' },
];

interface Position {
  id: number;
  bezeichnung: string;
  menge: number;
  einheit: string;
  ep: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function NewHoaiOfferPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState('');

  // Step 2 state (from HoaiCalculator)
  const [hoaiState, setHoaiState] = useState<HoaiCalculatorState | null>(null);

  // Step 3 state
  const [positions, setPositions] = useState<Position[]>([]);

  // Load real projects and organizations from tRPC
  const { data: projectsData } = trpc.projects.list.useQuery({ page: 1, pageSize: 100 });
  const projects = projectsData?.items ?? [];

  const { data: orgsData } = trpc.crm.organizations.list.useQuery({ page: 1, pageSize: 100 });
  const organizations = orgsData?.items ?? [];

  const createMutation = trpc.procurement.create.useMutation();
  const createGroupMutation = trpc.procurement.groups.create.useMutation();

  const handleHoaiStateChange = useCallback((state: HoaiCalculatorState) => {
    setHoaiState(state);
  }, []);

  const addPosition = () => {
    const newId = Math.max(...positions.map((p) => p.id), 0) + 1;
    setPositions((prev) => [
      ...prev,
      { id: newId, bezeichnung: '', menge: 1, einheit: 'psch', ep: 0 },
    ]);
  };

  const removePosition = (id: number) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePosition = (id: number, field: keyof Position, value: string | number) => {
    setPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handleSubmit = async () => {
    if (!projectId || !title) {
      setError('Bitte waehlen Sie ein Projekt und geben Sie einen Titel ein.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const feeResult = hoaiState?.feeResult;
      const midFee = feeResult
        ? (feeResult.totalNetMin + feeResult.totalNetMax) / 2
        : 0;

      // Create the HOAI offer procurement
      const created = await createMutation.mutateAsync({
        projectId: Number(projectId),
        type: 'hoai_offer',
        title,
        description: description || undefined,
        clientId: clientId ? Number(clientId) : undefined,
        totalValueNet: midFee > 0 ? midFee : undefined,
        vatRate: 19,
        nebenkostenPercent: hoaiState?.nebenkostenPercent,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        hoaiParams: hoaiState
          ? {
              serviceType: hoaiState.serviceType,
              zone: hoaiState.zone,
              baseCosts: hoaiState.eligibleCosts,
              calculatedFeeMin: feeResult?.totalNetMin ?? 0,
              calculatedFeeMax: feeResult?.totalNetMax ?? 0,
              offeredFee: midFee,
              conversionFactor: hoaiState.conversionFactor,
              coordinationFactor: hoaiState.coordinationFactor,
            }
          : undefined,
      });

      // Update the auto-created phase groups with the real fee data
      if (created && feeResult) {
        // The procurement.create already creates default phase groups for hoai_offer.
        // We can update them with calculated fees if needed via a follow-up.
      }

      router.push(`/hoai/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Erstellen';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === Number(projectId));
  const selectedClient = organizations.find((o) => o.id === Number(clientId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hoai">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Neues Honorarangebot
          </h1>
          <p className="text-muted-foreground">
            Erstellen Sie ein neues Honorarangebot nach HOAI
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step.nr} className="flex items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(step.nr)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                currentStep === step.nr
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > step.nr
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > step.nr ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                  {step.nr}
                </span>
              )}
              <span className="hidden sm:inline">{step.title}</span>
            </button>
            {index < steps.length - 1 && (
              <ArrowRight className="mx-1 h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Project & Client */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Projekt & Auftraggeber</CardTitle>
            <CardDescription>
              Waehlen Sie das Projekt und den Auftraggeber fuer das Honorarangebot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label>Projekt *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Projekt auswaehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Keine Projekte vorhanden. Bitte erstellen Sie zuerst ein Projekt.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Auftraggeber</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Auftraggeber auswaehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Angebotstitel *</Label>
              <Input
                id="title"
                placeholder="z.B. Objektplanung Gebaeude §34 HOAI"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Optionale Beschreibung des Honorarangebots..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid-until">Gueltig bis</Label>
              <Input
                id="valid-until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: HOAI Parameters + Phase Selection (combined) */}
      {currentStep === 2 && (
        <HoaiCalculator
          initialState={hoaiState ?? undefined}
          onStateChange={handleHoaiStateChange}
        />
      )}

      {/* Step 3: Additional Positions */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Zusaetzliche Positionen</CardTitle>
            <CardDescription>
              Fuegen Sie besondere Leistungen und zusaetzliche Positionen hinzu (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {positions.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium w-12">Pos</th>
                    <th className="pb-2 text-left font-medium">Bezeichnung</th>
                    <th className="pb-2 text-right font-medium w-20">Menge</th>
                    <th className="pb-2 text-center font-medium w-24">Einheit</th>
                    <th className="pb-2 text-right font-medium w-28">EP (EUR)</th>
                    <th className="pb-2 text-right font-medium w-28">Gesamt</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {positions.map((pos, index) => (
                    <tr key={pos.id}>
                      <td className="py-2 text-muted-foreground">{index + 1}</td>
                      <td className="py-2">
                        <Input
                          value={pos.bezeichnung}
                          onChange={(e) =>
                            updatePosition(pos.id, 'bezeichnung', e.target.value)
                          }
                          placeholder="Leistungsbeschreibung..."
                          className="h-8"
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          type="number"
                          value={pos.menge}
                          onChange={(e) =>
                            updatePosition(
                              pos.id,
                              'menge',
                              Number.parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-8 w-20 text-right"
                        />
                      </td>
                      <td className="py-2">
                        <Select
                          value={pos.einheit}
                          onValueChange={(v) => updatePosition(pos.id, 'einheit', v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="psch">psch</SelectItem>
                            <SelectItem value="St">St</SelectItem>
                            <SelectItem value="Std">Std</SelectItem>
                            <SelectItem value="m2">m2</SelectItem>
                            <SelectItem value="lfm">lfm</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2">
                        <Input
                          type="number"
                          value={pos.ep}
                          onChange={(e) =>
                            updatePosition(
                              pos.id,
                              'ep',
                              Number.parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-8 w-28 text-right"
                        />
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(pos.menge * pos.ep)}
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePosition(pos.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-bold">
                    <td colSpan={5} className="pt-3">
                      Summe Positionen
                    </td>
                    <td className="pt-3 text-right">
                      {formatCurrency(
                        positions.reduce((s, p) => s + p.menge * p.ep, 0),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}

            <Button variant="outline" size="sm" onClick={addPosition}>
              <Plus className="h-4 w-4" />
              Position hinzufuegen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Summary */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Zusammenfassung</CardTitle>
            <CardDescription>
              Ueberpruefen Sie das Honorarangebot vor dem Erstellen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 max-w-2xl">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projekt</span>
                <span className="font-medium">
                  {selectedProject?.name || '---'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auftraggeber</span>
                <span className="font-medium">
                  {selectedClient?.name || '---'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Titel</span>
                <span className="font-medium">{title || '---'}</span>
              </div>
              <Separator />
              {hoaiState && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leistungsbild</span>
                    <span className="font-medium">{hoaiState.serviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Honorarzone</span>
                    <span className="font-medium">Zone {hoaiState.zone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Anrechenbare Kosten</span>
                    <span className="font-medium">
                      {formatCurrency(hoaiState.eligibleCosts)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leistungsphasen</span>
                    <span className="font-medium">
                      {hoaiState.selectedPhases
                        .map((p) => `LP ${p}`)
                        .join(', ')}
                    </span>
                  </div>
                  {hoaiState.feeResult && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Honorarrahmen</span>
                        <span className="font-medium">
                          {formatCurrency(hoaiState.feeResult.totalNetMin)} &ndash;{' '}
                          {formatCurrency(hoaiState.feeResult.totalNetMax)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Mittelsatz (netto)</span>
                        <span className="text-primary">
                          {formatCurrency(
                            (hoaiState.feeResult.totalNetMin +
                              hoaiState.feeResult.totalNetMax) /
                              2,
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
              {positions.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zusaetzliche Positionen</span>
                    <span className="font-medium">{positions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Summe Positionen</span>
                    <span className="font-medium">
                      {formatCurrency(
                        positions.reduce((s, p) => s + p.menge * p.ep, 0),
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/hoai">Abbrechen</Link>
          </Button>
          {currentStep < 4 ? (
            <Button onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}>
              Weiter
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || !projectId || !title}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Angebot erstellen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
