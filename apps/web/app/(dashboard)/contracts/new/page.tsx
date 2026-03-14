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
  Skeleton,
  Textarea,
  useToast,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const contractTypeMap: Record<string, 'service' | 'construction' | 'consulting'> = {
  'VOB/B': 'construction',
  'BGB-Werkvertrag': 'service',
  'HOAI': 'consulting',
  'Dienstleistung': 'service',
  'Bauleistung': 'construction',
  'Beratung': 'consulting',
};

export default function NewContractPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [title, setTitle] = useState('');
  const [contractType, setContractType] = useState('');
  const [value, setValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  // Fetch real projects
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  // Fetch real organizations (contractors)
  const { data: orgsData, isLoading: orgsLoading } = trpc.crm.organizations.list.useQuery({
    type: 'contractor',
    page: 1,
    pageSize: 100,
  });

  const createMutation = trpc.finance.contracts.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Vertrag erstellt',
        description: `Vertrag "${data.title}" wurde erfolgreich angelegt.`,
      });
      router.push(`/contracts/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Fehler beim Erstellen',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !title.trim() || !contractType) {
      toast({
        title: 'Fehlende Pflichtfelder',
        description: 'Bitte Projekt, Titel und Vertragsart angeben.',
        variant: 'destructive',
      });
      return;
    }

    const apiType = contractTypeMap[contractType];
    if (!apiType) {
      toast({ title: 'Fehler', description: 'Ungültige Vertragsart.', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      projectId: parseInt(projectId),
      organizationId: organizationId ? parseInt(organizationId) : undefined,
      title: title.trim(),
      contractType: apiType,
      totalFeeNet: value ? parseFloat(value.replace(',', '.')) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      plannedEndDate: endDate ? new Date(endDate) : undefined,
      description: description || undefined,
      status: 'draft',
    });
  };

  const projects = projectsData?.items ?? [];
  const organizations = orgsData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contracts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neuer Vertrag</h1>
          <p className="text-muted-foreground">
            Erstellen Sie einen neuen Vertrag mit einem Auftragnehmer
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vertragspartner</CardTitle>
            <CardDescription>
              Projekt und Auftragnehmer auswählen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Projekt *</Label>
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
              <Label>Auftragnehmer</Label>
              {orgsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auftragnehmer auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vertragsdaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Vertragstitel *</Label>
              <Input
                id="title"
                placeholder="z.B. Rohbauarbeiten"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="value">Vertragssumme (netto)</Label>
                <div className="relative">
                  <Input
                    id="value"
                    placeholder="0,00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    EUR
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Vertragsart *</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Art auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bauleistung">Bauleistung (VOB/B)</SelectItem>
                    <SelectItem value="Dienstleistung">Dienstleistung (BGB)</SelectItem>
                    <SelectItem value="Beratung">Beratung (HOAI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-date">Beginn</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Vertragsende</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Vertragsbeschreibung und Leistungsumfang..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Vertrag erstellen
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/contracts">Abbrechen</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
