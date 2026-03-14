'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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
import { trpc } from '@/lib/trpc';

const estimationTypeMap: Record<string, string> = {
  kostenschaetzung: 'Kostenschaetzung (nach DIN 276)',
  kostenberechnung: 'Kostenberechnung (nach DIN 276)',
  kostenanschlag: 'Kostenanschlag (nach DIN 276)',
  kostenfeststellung: 'Kostenfeststellung (nach DIN 276)',
};

export default function NewCostEstimationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState('');
  const [dinLevel, setDinLevel] = useState('2');
  const [baseDate, setBaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load real projects from tRPC
  const { data: projectsData } = trpc.projects.list.useQuery({ page: 1, pageSize: 100 });
  const projects = projectsData?.items ?? [];

  const createMutation = trpc.finance.costEstimations.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !name || !type) {
      setError('Bitte fuellen Sie alle Pflichtfelder aus.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createMutation.mutateAsync({
        projectId: Number(projectId),
        name,
        estimationType: type as 'kostenschaetzung' | 'kostenberechnung' | 'kostenanschlag' | 'kostenfeststellung',
        din276Level: Number(dinLevel),
        status: 'draft',
        baseDate: baseDate ? new Date(`${baseDate}-01`) : undefined,
        vatRate: 19,
        notes: notes || undefined,
      });

      router.push(`/costs/${created.id}`);
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
          <Link href="/costs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Neue Kostenschaetzung
          </h1>
          <p className="text-muted-foreground">
            Erstellen Sie eine neue Kostenschaetzung nach DIN 276
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grunddaten</CardTitle>
            <CardDescription>
              Geben Sie die Grunddaten fuer die Kostenschaetzung ein
            </CardDescription>
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
              <Label htmlFor="name">Bezeichnung *</Label>
              <Input
                id="name"
                placeholder="z.B. Kostenschaetzung Neubau Buerogebaeude"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Typ *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Typ auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(estimationTypeMap).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="din-level">DIN 276 Gliederungsebene</Label>
                <Select value={dinLevel} onValueChange={setDinLevel}>
                  <SelectTrigger id="din-level">
                    <SelectValue placeholder="Ebene auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1. Ebene (100, 200, ...)</SelectItem>
                    <SelectItem value="2">2. Ebene (110, 120, ...)</SelectItem>
                    <SelectItem value="3">3. Ebene (111, 112, ...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-date">Preisstand (Basisdatum)</Label>
              <Input
                id="base-date"
                type="month"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Referenzdatum fuer die Preisermittlung
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Bemerkungen</Label>
              <Textarea
                id="notes"
                placeholder="Optionale Bemerkungen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !projectId || !name || !type}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Kostenschaetzung erstellen
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/costs">Abbrechen</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
