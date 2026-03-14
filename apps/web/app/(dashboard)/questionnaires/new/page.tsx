'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
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

const mockProjects = [
  { id: '1', name: 'Neubau Bürogebäude Friedrichstraße' },
  { id: '2', name: 'Sanierung Wohnanlage Prenzlauer Berg' },
  { id: '3', name: 'Kindergarten Am Stadtpark' },
  { id: '4', name: 'Umbau Industriehalle Spandau' },
  { id: '5', name: 'Erweiterung Schulgebäude Mitte' },
];

interface Question {
  id: number;
  text: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  required: boolean;
  options: string;
}

interface FormSection {
  id: number;
  title: string;
  description: string;
  questions: Question[];
}

export default function NewQuestionnairePage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [sections, setSections] = useState<FormSection[]>([
    {
      id: 1,
      title: '',
      description: '',
      questions: [
        { id: 1, text: '', type: 'text', required: false, options: '' },
      ],
    },
  ]);

  const addSection = () => {
    const newId = Math.max(...sections.map((s) => s.id), 0) + 1;
    setSections((prev) => [
      ...prev,
      {
        id: newId,
        title: '',
        description: '',
        questions: [
          { id: 1, text: '', type: 'text', required: false, options: '' },
        ],
      },
    ]);
  };

  const removeSection = (sectionId: number) => {
    if (sections.length === 1) return;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const updateSection = (sectionId: number, field: string, value: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s)),
    );
  };

  const addQuestion = (sectionId: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const newQId = Math.max(...s.questions.map((q) => q.id), 0) + 1;
        return {
          ...s,
          questions: [
            ...s.questions,
            { id: newQId, text: '', type: 'text' as const, required: false, options: '' },
          ],
        };
      }),
    );
  };

  const removeQuestion = (sectionId: number, questionId: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        if (s.questions.length === 1) return s;
        return {
          ...s,
          questions: s.questions.filter((q) => q.id !== questionId),
        };
      }),
    );
  };

  const updateQuestion = (
    sectionId: number,
    questionId: number,
    field: keyof Question,
    value: string | boolean,
  ) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: s.questions.map((q) =>
            q.id === questionId ? { ...q, [field]: value } : q,
          ),
        };
      }),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: tRPC mutation to create questionnaire
    router.push('/questionnaires');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/questionnaires">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Neuer Fragebogen
          </h1>
          <p className="text-muted-foreground">
            Erstellen Sie einen neuen Fragebogen für ein Projekt
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
            <div className="space-y-2">
              <Label>Projekt</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Projekt auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {mockProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name des Fragebogens</Label>
              <Input
                id="name"
                placeholder="z.B. Bedarfsermittlung Bürogebäude"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Kurze Beschreibung des Fragebogens..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {sections.map((section, sectionIndex) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Abschnitt {sectionIndex + 1}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSection(section.id)}
                  className="text-destructive"
                  disabled={sections.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Abschnittstitel</Label>
                  <Input
                    placeholder="z.B. Allgemeine Informationen"
                    value={section.title}
                    onChange={(e) =>
                      updateSection(section.id, 'title', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Input
                    placeholder="Kurze Beschreibung..."
                    value={section.description}
                    onChange={(e) =>
                      updateSection(section.id, 'description', e.target.value)
                    }
                  />
                </div>
              </div>

              <Separator />

              <p className="text-sm font-medium text-muted-foreground">Fragen</p>

              {section.questions.map((question, qIndex) => (
                <div
                  key={question.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-2 text-sm text-muted-foreground">
                      {qIndex + 1}.
                    </span>
                    <div className="flex-1 space-y-3">
                      <Input
                        placeholder="Fragetext eingeben..."
                        value={question.text}
                        onChange={(e) =>
                          updateQuestion(
                            section.id,
                            question.id,
                            'text',
                            e.target.value,
                          )
                        }
                      />
                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Fragetyp</Label>
                          <Select
                            value={question.type}
                            onValueChange={(v) =>
                              updateQuestion(section.id, question.id, 'type', v)
                            }
                          >
                            <SelectTrigger className="w-[160px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Freitext</SelectItem>
                              <SelectItem value="number">Zahl</SelectItem>
                              <SelectItem value="boolean">Ja / Nein</SelectItem>
                              <SelectItem value="select">Auswahl</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <label className="flex items-center gap-2 text-sm mt-4">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) =>
                              updateQuestion(
                                section.id,
                                question.id,
                                'required',
                                e.target.checked,
                              )
                            }
                            className="rounded border-input"
                          />
                          Pflichtfeld
                        </label>
                      </div>
                      {question.type === 'select' && (
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Optionen (kommagetrennt)
                          </Label>
                          <Input
                            placeholder="Option 1, Option 2, Option 3"
                            value={question.options}
                            onChange={(e) =>
                              updateQuestion(
                                section.id,
                                question.id,
                                'options',
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(section.id, question.id)}
                      className="shrink-0 text-destructive mt-1"
                      disabled={section.questions.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addQuestion(section.id)}
              >
                <Plus className="h-4 w-4" />
                Frage hinzufügen
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addSection} className="w-full">
          <Plus className="h-4 w-4" />
          Abschnitt hinzufügen
        </Button>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit">
            <Save className="h-4 w-4" />
            Fragebogen erstellen
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/questionnaires">Abbrechen</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
