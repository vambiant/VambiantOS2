'use client';

import { useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@vambiant/ui';

export interface TaskFormData {
  id?: string;
  title: string;
  description: string;
  module: string;
  milestone: string;
  assignee: string;
  priority: string;
  estimatedHours: string;
  startDate: string;
  dueDate: string;
  status: string;
  hoaiPhases: string[];
}

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<TaskFormData>;
  onSubmit: (data: TaskFormData) => void;
  mode?: 'create' | 'edit';
}

const modules = [
  { value: 'lp1', label: 'LP 1 - Grundlagenermittlung' },
  { value: 'lp2', label: 'LP 2 - Vorplanung' },
  { value: 'lp3', label: 'LP 3 - Entwurfsplanung' },
  { value: 'lp4', label: 'LP 4 - Genehmigungsplanung' },
  { value: 'lp5', label: 'LP 5 - Ausführungsplanung' },
  { value: 'lp6', label: 'LP 6 - Vorbereitung der Vergabe' },
  { value: 'lp7', label: 'LP 7 - Mitwirkung bei der Vergabe' },
  { value: 'lp8', label: 'LP 8 - Objektüberwachung' },
  { value: 'lp9', label: 'LP 9 - Objektbetreuung' },
];

const milestones = [
  { value: 'ms1', label: 'Baugenehmigung eingereicht' },
  { value: 'ms2', label: 'Ausführungsplanung 50%' },
  { value: 'ms3', label: 'Ausschreibung starten' },
  { value: 'ms4', label: 'Vergabe abschließen' },
];

const assignees = [
  { value: '1', label: 'Max Mustermann' },
  { value: '2', label: 'Anna Schmidt' },
  { value: '3', label: 'Thomas Müller' },
  { value: '4', label: 'Lisa Weber' },
  { value: '5', label: 'Stefan Braun' },
];

const priorities = [
  { value: '1', label: 'Sehr niedrig', color: 'bg-gray-400' },
  { value: '2', label: 'Niedrig', color: 'bg-blue-400' },
  { value: '3', label: 'Mittel', color: 'bg-yellow-400' },
  { value: '4', label: 'Hoch', color: 'bg-orange-400' },
  { value: '5', label: 'Kritisch', color: 'bg-red-500' },
];

const statusOptions = [
  { value: 'offen', label: 'Offen' },
  { value: 'in_bearbeitung', label: 'In Bearbeitung' },
  { value: 'review', label: 'Review' },
  { value: 'erledigt', label: 'Erledigt' },
  { value: 'blockiert', label: 'Blockiert' },
];

const hoaiPhaseOptions = [
  { id: 'lp1', label: 'LP 1' },
  { id: 'lp2', label: 'LP 2' },
  { id: 'lp3', label: 'LP 3' },
  { id: 'lp4', label: 'LP 4' },
  { id: 'lp5', label: 'LP 5' },
  { id: 'lp6', label: 'LP 6' },
  { id: 'lp7', label: 'LP 7' },
  { id: 'lp8', label: 'LP 8' },
  { id: 'lp9', label: 'LP 9' },
];

const defaultFormData: TaskFormData = {
  title: '',
  description: '',
  module: '',
  milestone: '',
  assignee: '',
  priority: '3',
  estimatedHours: '',
  startDate: '',
  dueDate: '',
  status: 'offen',
  hoaiPhases: [],
};

export function TaskForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  mode = 'create',
}: TaskFormProps) {
  const [form, setForm] = useState<TaskFormData>({
    ...defaultFormData,
    ...initialData,
  });

  const handlePhaseToggle = (phaseId: string) => {
    setForm((prev) => ({
      ...prev,
      hoaiPhases: prev.hoaiPhases.includes(phaseId)
        ? prev.hoaiPhases.filter((p) => p !== phaseId)
        : [...prev.hoaiPhases, phaseId],
    }));
  };

  const handleSubmit = () => {
    onSubmit(form);
    onOpenChange(false);
    setForm({ ...defaultFormData });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? 'Erstellen Sie eine neue Aufgabe für dieses Projekt'
              : 'Bearbeiten Sie die Aufgabendetails'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Title */}
          <div>
            <Label htmlFor="task-title">Titel *</Label>
            <Input
              id="task-title"
              placeholder="Aufgabentitel eingeben..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="task-description">Beschreibung</Label>
            <Textarea
              id="task-description"
              placeholder="Beschreibung der Aufgabe..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="mt-1.5"
              rows={4}
            />
          </div>

          <Separator />

          {/* Status & Priority */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priorität</Label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm({ ...form, priority: value })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${p.color}`} />
                        {p.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Module & Milestone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Modul</Label>
              <Select
                value={form.module}
                onValueChange={(value) =>
                  setForm({ ...form, module: value })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Modul wählen" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Meilenstein</Label>
              <Select
                value={form.milestone}
                onValueChange={(value) =>
                  setForm({ ...form, milestone: value })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {milestones.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee & Hours */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Zugewiesen an</Label>
              <Select
                value={form.assignee}
                onValueChange={(value) =>
                  setForm({ ...form, assignee: value })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Mitarbeiter wählen" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="task-hours">Geschätzte Stunden</Label>
              <Input
                id="task-hours"
                type="number"
                placeholder="0"
                value={form.estimatedHours}
                onChange={(e) =>
                  setForm({ ...form, estimatedHours: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-start">Startdatum</Label>
              <Input
                id="task-start"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="task-due">Fälligkeitsdatum</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm({ ...form, dueDate: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
          </div>

          <Separator />

          {/* HOAI Phase checkboxes */}
          <div>
            <Label className="text-sm font-medium">
              HOAI-Leistungsphasen
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ordnen Sie die Aufgabe einer oder mehreren Leistungsphasen zu
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hoaiPhaseOptions.map((phase) => (
                <label
                  key={phase.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-accent/50 ${
                    form.hoaiPhases.includes(phase.id)
                      ? 'border-primary bg-primary/5 text-primary'
                      : ''
                  }`}
                >
                  <Checkbox
                    checked={form.hoaiPhases.includes(phase.id)}
                    onCheckedChange={() => handlePhaseToggle(phase.id)}
                    className="h-3.5 w-3.5"
                  />
                  {phase.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={!form.title.trim()}>
            {mode === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
