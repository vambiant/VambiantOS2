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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@vambiant/ui';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const vergabeartOptions = [
  { value: 'offen', label: 'Offenes Verfahren' },
  { value: 'beschraenkt', label: 'Beschraenkte Ausschreibung' },
  { value: 'freihaendig', label: 'Freihaendige Vergabe' },
];

const contractTypeOptions = [
  { value: 'vob_b', label: 'VOB/B' },
  { value: 'vob_a', label: 'VOB/A' },
  { value: 'bgb', label: 'BGB-Bauvertrag' },
];

export default function NewAVATenderPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [vergabeart, setVergabeart] = useState('');
  const [contractType, setContractType] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [executionStart, setExecutionStart] = useState('');
  const [executionEnd, setExecutionEnd] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load real projects from tRPC
  const { data: projectsData } = trpc.projects.list.useQuery({
    page: 1,
    pageSize: 100,
  });
  const projects = projectsData?.items ?? [];

  const createMutation = trpc.procurement.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !title || !vergabeart) {
      setError('Bitte fuellen Sie alle Pflichtfelder aus.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const parsedValue = estimatedValue
        ? Number.parseFloat(estimatedValue.replace(/\./g, '').replace(',', '.'))
        : undefined;

      const created = await createMutation.mutateAsync({
        projectId: Number(projectId),
        type: 'ava_tender',
        title,
        description: description || undefined,
        totalValueNet: parsedValue && !Number.isNaN(parsedValue) ? parsedValue : undefined,
        vatRate: 19,
        notes: notes || undefined,
        avaParams: {
          vergabeart,
          contractType: contractType || undefined,
          submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : undefined,
          executionStart: executionStart ? new Date(executionStart) : undefined,
          executionEnd: executionEnd ? new Date(executionEnd) : undefined,
        },
      });

      router.push(`/ava/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Erstellen';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ava">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neue Ausschreibung</h1>
          <p className="text-muted-foreground">Erstellen Sie eine neue Ausschreibung (AVA)</p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Grunddaten */}
        <Card>
          <CardHeader>
            <CardTitle>Grunddaten</CardTitle>
            <CardDescription>Grundlegende Informationen zur Ausschreibung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">Projekt *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Projekt auswaehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
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
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                placeholder="z.B. Rohbauarbeiten, Elektroinstallation..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Detaillierte Beschreibung der Ausschreibung..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vergabe-Parameter */}
        <Card>
          <CardHeader>
            <CardTitle>Vergabeparameter</CardTitle>
            <CardDescription>Vergabeart, Vertragstyp und Termine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vergabeart">Vergabeart *</Label>
                <Select value={vergabeart} onValueChange={setVergabeart}>
                  <SelectTrigger id="vergabeart">
                    <SelectValue placeholder="Vergabeart auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vergabeartOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractType">Vertragstyp</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger id="contractType">
                    <SelectValue placeholder="Vertragstyp auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submissionDeadline">Abgabefrist (Submission Deadline)</Label>
              <Input
                id="submissionDeadline"
                type="datetime-local"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Bis wann muessen die Angebote eingereicht werden?
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="executionStart">Ausfuehrungsbeginn</Label>
                <Input
                  id="executionStart"
                  type="date"
                  value={executionStart}
                  onChange={(e) => setExecutionStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="executionEnd">Ausfuehrungsende</Label>
                <Input
                  id="executionEnd"
                  type="date"
                  value={executionEnd}
                  onChange={(e) => setExecutionEnd(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finanzen */}
        <Card>
          <CardHeader>
            <CardTitle>Schaetzkosten</CardTitle>
            <CardDescription>Geschaetzte Auftragssumme (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Geschaetzte Auftragssumme (netto)</Label>
              <div className="relative">
                <Input
                  id="estimatedValue"
                  placeholder="z.B. 500.000"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  EUR
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Interne Schaetzung, wird nicht an Bieter weitergegeben
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Bemerkungen</Label>
              <Textarea
                id="notes"
                placeholder="Interne Bemerkungen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !projectId || !title || !vergabeart}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ausschreibung erstellen
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/ava">Abbrechen</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
