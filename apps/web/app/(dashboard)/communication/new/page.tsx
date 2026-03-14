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
  Textarea,
} from '@vambiant/ui';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

interface Participant {
  id: number;
  name: string;
  role: string;
}

interface ActionItem {
  id: number;
  text: string;
  assignee: string;
  dueDate: string;
}

export default function NewCommunicationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState('meeting_protocol');
  const [projectId, setProjectId] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');

  const [participants, setParticipants] = useState<Participant[]>([
    { id: 1, name: '', role: '' },
  ]);

  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  const { data: projectsList } = trpc.projects.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  const projects = projectsList?.items ?? [];

  const createMutation = trpc.communication.create.useMutation({
    onSuccess: (newComm) => {
      toast({
        title: 'Protokoll erstellt',
        description: `"${subject}" wurde erfolgreich erstellt.`,
      });
      router.push(`/communication/${newComm.id}`);
    },
    onError: (err) => {
      toast({
        title: 'Fehler beim Erstellen',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const addParticipant = () => {
    const newId = Math.max(...participants.map((p) => p.id), 0) + 1;
    setParticipants((prev) => [...prev, { id: newId, name: '', role: '' }]);
  };

  const removeParticipant = (id: number) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const updateParticipant = (id: number, field: keyof Participant, value: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const addActionItem = () => {
    const newId =
      actionItems.length > 0
        ? Math.max(...actionItems.map((a) => a.id)) + 1
        : 1;
    setActionItems((prev) => [
      ...prev,
      { id: newId, text: '', assignee: '', dueDate: '' },
    ]);
  };

  const removeActionItem = (id: number) => {
    setActionItems((prev) => prev.filter((a) => a.id !== id));
  };

  const updateActionItem = (id: number, field: keyof ActionItem, value: string) => {
    setActionItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !subject || !date) {
      toast({
        title: 'Fehlende Angaben',
        description: 'Bitte Projekt, Betreff und Datum ausfüllen.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate({
      projectId: parseInt(projectId, 10),
      type,
      subject,
      date: new Date(date),
      location: location || undefined,
      content: content || undefined,
      metadata: {
        time,
        participants: participants.filter((p) => p.name),
        actionItemsDraft: actionItems.filter((a) => a.text),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/communication">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Neues Protokoll
          </h1>
          <p className="text-muted-foreground">
            Erstellen Sie ein neues Besprechungsprotokoll
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Grunddaten */}
        <Card>
          <CardHeader>
            <CardTitle>Grunddaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting_protocol">
                      Projektbesprechung
                    </SelectItem>
                    <SelectItem value="correspondence">
                      Schriftverkehr
                    </SelectItem>
                    <SelectItem value="note">Notiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Projekt</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                placeholder="z.B. Projektbesprechung #12"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Uhrzeit</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ort</Label>
                <Input
                  id="location"
                  placeholder="Besprechungsraum..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teilnehmer */}
        <Card>
          <CardHeader>
            <CardTitle>Teilnehmer</CardTitle>
            <CardDescription>
              Teilnehmer der Besprechung hinzufügen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {participants.map((p, index) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-8">
                  {index + 1}.
                </span>
                <Input
                  placeholder="Name"
                  value={p.name}
                  onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Funktion / Firma"
                  value={p.role}
                  onChange={(e) => updateParticipant(p.id, 'role', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeParticipant(p.id)}
                  className="shrink-0 text-destructive"
                  disabled={participants.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
              <Plus className="h-4 w-4" />
              Teilnehmer hinzufügen
            </Button>
          </CardContent>
        </Card>

        {/* Inhalt */}
        <Card>
          <CardHeader>
            <CardTitle>Protokollinhalt</CardTitle>
            <CardDescription>
              Tagesordnungspunkte und Besprechungsinhalte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="TOP 1: ...&#10;&#10;TOP 2: ...&#10;&#10;Beschlüsse und Ergebnisse hier eintragen..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
            />
          </CardContent>
        </Card>

        {/* Maßnahmen */}
        <Card>
          <CardHeader>
            <CardTitle>Maßnahmen / Aufgaben</CardTitle>
            <CardDescription>
              Aufgaben mit Verantwortlichen und Terminen festlegen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span className="mt-2 text-sm text-muted-foreground w-6">
                  {index + 1}.
                </span>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Aufgabenbeschreibung"
                    value={item.text}
                    onChange={(e) =>
                      updateActionItem(item.id, 'text', e.target.value)
                    }
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Verantwortlich"
                      value={item.assignee}
                      onChange={(e) =>
                        updateActionItem(item.id, 'assignee', e.target.value)
                      }
                    />
                    <Input
                      type="date"
                      value={item.dueDate}
                      onChange={(e) =>
                        updateActionItem(item.id, 'dueDate', e.target.value)
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeActionItem(item.id)}
                  className="shrink-0 text-destructive mt-1"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addActionItem}>
              <Plus className="h-4 w-4" />
              Maßnahme hinzufügen
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Protokoll erstellen
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/communication">Abbrechen</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
