'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  DollarSign,
  FileText,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Input,
  Label,
  Textarea,
  Checkbox,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@vambiant/ui';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const steps = [
  { id: 'grunddaten', label: 'Grunddaten', icon: Building2 },
  { id: 'hoai', label: 'HOAI', icon: FileText },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'zusammenfassung', label: 'Zusammenfassung', icon: Check },
];

const buildingTypes = [
  { value: 'wohngebaeude', label: 'Wohngebaude' },
  { value: 'buerogebaeude', label: 'Buerogebaude' },
  { value: 'gewerbe', label: 'Gewerbe' },
  { value: 'industrie', label: 'Industrie' },
  { value: 'bildung', label: 'Bildungsbauten' },
  { value: 'gesundheit', label: 'Gesundheitsbauten' },
  { value: 'kultur', label: 'Kulturbauten' },
  { value: 'verkehr', label: 'Verkehrsbauten' },
  { value: 'sport', label: 'Sportbauten' },
  { value: 'sakral', label: 'Sakralbauten' },
  { value: 'sonstige', label: 'Sonstige Gebaude' },
];

const hoaiZones = [
  { value: 1, label: 'Honorarzone I', description: 'Sehr geringe Planungsanforderungen' },
  { value: 2, label: 'Honorarzone II', description: 'Geringe Planungsanforderungen' },
  { value: 3, label: 'Honorarzone III', description: 'Durchschnittliche Planungsanforderungen' },
  { value: 4, label: 'Honorarzone IV', description: 'Ueberdurchschnittliche Planungsanforderungen' },
  { value: 5, label: 'Honorarzone V', description: 'Sehr hohe Planungsanforderungen' },
];

const hoaiPhases = [
  { id: 1, label: 'LP 1 - Grundlagenermittlung', percent: 2 },
  { id: 2, label: 'LP 2 - Vorplanung', percent: 7 },
  { id: 3, label: 'LP 3 - Entwurfsplanung', percent: 15 },
  { id: 4, label: 'LP 4 - Genehmigungsplanung', percent: 3 },
  { id: 5, label: 'LP 5 - Ausfuehrungsplanung', percent: 25 },
  { id: 6, label: 'LP 6 - Vorbereitung der Vergabe', percent: 10 },
  { id: 7, label: 'LP 7 - Mitwirkung bei der Vergabe', percent: 4 },
  { id: 8, label: 'LP 8 - Objektueberwachung', percent: 32 },
  { id: 9, label: 'LP 9 - Objektbetreuung', percent: 2 },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    code: '',
    buildingType: '',
    description: '',
    hoaiZone: 0,
    selectedPhases: [1, 2, 3, 4, 5] as number[],
    budgetNet: '',
    estimatedHours: '',
    startDate: '',
    endDate: '',
    status: 'draft' as const,
  });

  const createProjectMutation = trpc.projects.create.useMutation();
  const createModuleMutation = trpc.modules.create.useMutation();

  const handlePhaseToggle = (phaseId: number) => {
    setForm((prev) => ({
      ...prev,
      selectedPhases: prev.selectedPhases.includes(phaseId)
        ? prev.selectedPhases.filter((p) => p !== phaseId)
        : [...prev.selectedPhases, phaseId],
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Build project create input
      const projectInput: {
        name: string;
        code?: string;
        description?: string;
        buildingType?: string;
        hoaiZone?: number;
        budgetNet?: number;
        estimatedHours?: number;
        startDate?: Date;
        endDate?: Date;
        status: 'draft' | 'active' | 'on_hold' | 'completed' | 'archived' | 'cancelled';
      } = {
        name: form.name,
        status: form.status,
      };

      if (form.code) projectInput.code = form.code;
      if (form.description) projectInput.description = form.description;
      if (form.buildingType) projectInput.buildingType = form.buildingType;
      if (form.hoaiZone > 0) projectInput.hoaiZone = form.hoaiZone;

      if (form.budgetNet) {
        const parsed = parseFloat(form.budgetNet.replace(',', '.'));
        if (!isNaN(parsed)) projectInput.budgetNet = parsed;
      }
      if (form.estimatedHours) {
        const parsed = parseFloat(form.estimatedHours);
        if (!isNaN(parsed)) projectInput.estimatedHours = parsed;
      }
      if (form.startDate) projectInput.startDate = new Date(form.startDate);
      if (form.endDate) projectInput.endDate = new Date(form.endDate);

      const newProject = await createProjectMutation.mutateAsync(projectInput);

      // Create HOAI modules for selected phases
      for (const phaseId of form.selectedPhases.sort((a, b) => a - b)) {
        const phase = hoaiPhases.find((p) => p.id === phaseId);
        if (!phase) continue;

        try {
          await createModuleMutation.mutateAsync({
            projectId: newProject.id,
            name: phase.label.split(' - ')[1] || phase.label,
            hoaiPhase: phaseId,
            sortOrder: phaseId,
            status: 'planned',
          });
        } catch {
          // Continue creating other modules even if one fails
          console.error(`Failed to create module LP ${phaseId}`);
        }
      }

      toast({
        title: 'Projekt erstellt',
        description: `"${newProject.name}" wurde erfolgreich erstellt.`,
      });

      router.push(`/projects/${newProject.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast({
        title: 'Fehler beim Erstellen',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return form.name.trim() !== '';
      case 1:
        return form.hoaiZone > 0 && form.selectedPhases.length > 0;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neues Projekt</h1>
          <p className="text-sm text-muted-foreground">
            Erstellen Sie ein neues Projekt in wenigen Schritten
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <div key={step.id} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => index < currentStep && setCurrentStep(index)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{index + 1}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`hidden h-px flex-1 sm:block ${
                    index < currentStep ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 0: Grunddaten */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <CardTitle className="text-lg">Grunddaten</CardTitle>
                <CardDescription>
                  Geben Sie die grundlegenden Projektinformationen ein
                </CardDescription>
              </div>
              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Projektname *</Label>
                  <Input
                    id="name"
                    placeholder="z.B. Neubau Buerogebaude Friedrichstrasse"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="code">Projektnummer</Label>
                  <Input
                    id="code"
                    placeholder="z.B. PRJ-2026-001"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Gebaeudetyp</Label>
                  <Select
                    value={form.buildingType}
                    onValueChange={(value) => setForm({ ...form, buildingType: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Gebaeudetyp waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildingTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    placeholder="Optionale Projektbeschreibung..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: HOAI */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <CardTitle className="text-lg">HOAI-Einstellungen</CardTitle>
                <CardDescription>
                  Konfigurieren Sie Honorarzone und Leistungsphasen
                </CardDescription>
              </div>
              <Separator />

              <div>
                <Label className="text-sm font-medium">Honorarzone *</Label>
                <div className="mt-3 grid gap-2">
                  {hoaiZones.map((zone) => (
                    <button
                      key={zone.value}
                      type="button"
                      onClick={() => setForm({ ...form, hoaiZone: zone.value })}
                      className={`flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 ${
                        form.hoaiZone === zone.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : ''
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground">
                        {zone.value}
                      </div>
                      <div>
                        <p className="font-medium">{zone.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {zone.description}
                        </p>
                      </div>
                      {form.hoaiZone === zone.value && (
                        <Check className="ml-auto h-5 w-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Leistungsphasen *
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm({
                          ...form,
                          selectedPhases: hoaiPhases.map((p) => p.id),
                        })
                      }
                    >
                      Alle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm({ ...form, selectedPhases: [] })
                      }
                    >
                      Keine
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {hoaiPhases.map((phase) => (
                    <label
                      key={phase.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                        form.selectedPhases.includes(phase.id)
                          ? 'border-primary/30 bg-primary/5'
                          : ''
                      }`}
                    >
                      <Checkbox
                        checked={form.selectedPhases.includes(phase.id)}
                        onCheckedChange={() => handlePhaseToggle(phase.id)}
                      />
                      <span className="flex-1 text-sm font-medium">
                        {phase.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {phase.percent}%
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ausgewaehlt:{' '}
                  {form.selectedPhases.reduce((sum, id) => {
                    const phase = hoaiPhases.find((p) => p.id === id);
                    return sum + (phase?.percent || 0);
                  }, 0)}
                  % der Gesamtleistung
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Budget */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <CardTitle className="text-lg">Budget & Zeitraum</CardTitle>
                <CardDescription>
                  Definieren Sie das Budget und den Zeitraum
                </CardDescription>
              </div>
              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="budgetNet">Honorar (netto)</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="budgetNet"
                      type="text"
                      placeholder="0,00"
                      value={form.budgetNet}
                      onChange={(e) =>
                        setForm({ ...form, budgetNet: e.target.value })
                      }
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      EUR
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="estimatedHours">Geschaetzte Stunden</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="estimatedHours"
                      type="number"
                      placeholder="0"
                      value={form.estimatedHours}
                      onChange={(e) =>
                        setForm({ ...form, estimatedHours: e.target.value })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      h
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="startDate">Startdatum</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Enddatum</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>

              {form.budgetNet && form.estimatedHours && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Kalkulation</p>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <span className="text-muted-foreground">
                        Effektiver Stundensatz:
                      </span>
                      <p className="font-medium">
                        {(
                          parseFloat(form.budgetNet.replace(',', '.')) /
                          parseFloat(form.estimatedHours)
                        ).toFixed(2)}{' '}
                        EUR/h
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Stunden pro Phase:
                      </span>
                      <p className="font-medium">
                        ~
                        {Math.round(
                          parseFloat(form.estimatedHours) /
                            form.selectedPhases.length,
                        )}{' '}
                        h
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Leistungsphasen:
                      </span>
                      <p className="font-medium">{form.selectedPhases.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Zusammenfassung */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <CardTitle className="text-lg">Zusammenfassung</CardTitle>
                <CardDescription>
                  Ueberpruefen Sie die Projektdaten vor dem Erstellen
                </CardDescription>
              </div>
              <Separator />

              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Grunddaten</h3>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Projektname:</span>
                      <p className="font-medium">{form.name}</p>
                    </div>
                    {form.code && (
                      <div>
                        <span className="text-muted-foreground">Projektnummer:</span>
                        <p className="font-medium">{form.code}</p>
                      </div>
                    )}
                    {form.buildingType && (
                      <div>
                        <span className="text-muted-foreground">Gebaeudetyp:</span>
                        <p className="font-medium">
                          {buildingTypes.find((t) => t.value === form.buildingType)?.label}
                        </p>
                      </div>
                    )}
                    {form.description && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Beschreibung:</span>
                        <p className="font-medium">{form.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">HOAI</h3>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Honorarzone:</span>
                      <p className="font-medium">
                        {hoaiZones.find((z) => z.value === form.hoaiZone)?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Leistungsphasen:</span>
                      <p className="font-medium">
                        {form.selectedPhases.sort((a, b) => a - b).map((id) => `LP ${id}`).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>

                {(form.budgetNet || form.estimatedHours || form.startDate || form.endDate) && (
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Budget & Zeitraum</h3>
                    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                      {form.budgetNet && (
                        <div>
                          <span className="text-muted-foreground">Honorar (netto):</span>
                          <p className="font-medium">{form.budgetNet} EUR</p>
                        </div>
                      )}
                      {form.estimatedHours && (
                        <div>
                          <span className="text-muted-foreground">Geschaetzte Stunden:</span>
                          <p className="font-medium">{form.estimatedHours} h</p>
                        </div>
                      )}
                      {form.startDate && (
                        <div>
                          <span className="text-muted-foreground">Startdatum:</span>
                          <p className="font-medium">
                            {new Date(form.startDate).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      )}
                      {form.endDate && (
                        <div>
                          <span className="text-muted-foreground">Enddatum:</span>
                          <p className="font-medium">
                            {new Date(form.endDate).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={isSubmitting}
          onClick={() =>
            currentStep === 0
              ? router.push('/projects')
              : setCurrentStep(currentStep - 1)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 0 ? 'Abbrechen' : 'Zurueck'}
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
          >
            Weiter
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Wird erstellt...' : 'Projekt erstellen'}
          </Button>
        )}
      </div>
    </div>
  );
}
