'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Save,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Textarea,
} from '@vambiant/ui';

interface Question {
  id: number;
  text: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  answer: string;
  required: boolean;
}

interface Section {
  id: number;
  title: string;
  description: string;
  questions: Question[];
  completed: boolean;
}

const initialSections: Section[] = [
  {
    id: 1,
    title: 'Allgemeine Informationen',
    description: 'Grundlegende Angaben zum Raumprogramm und zur Nutzung',
    completed: true,
    questions: [
      {
        id: 101,
        text: 'Wie viele Mitarbeiter werden das Gebäude nutzen?',
        type: 'number',
        answer: '120',
        required: true,
      },
      {
        id: 102,
        text: 'Welche Arbeitsplatztypen werden benötigt?',
        type: 'select',
        options: [
          'Einzelbüros',
          'Doppelbüros',
          'Großraumbüro',
          'Kombibüro',
          'Open Space',
        ],
        answer: 'Kombibüro',
        required: true,
      },
      {
        id: 103,
        text: 'Sind Homeoffice-Arbeitsplätze eingeplant?',
        type: 'boolean',
        answer: 'true',
        required: false,
      },
      {
        id: 104,
        text: 'Besondere Anforderungen an die Barrierefreiheit?',
        type: 'text',
        answer: 'Vollständige Barrierefreiheit gemäß DIN 18040 erforderlich.',
        required: true,
      },
    ],
  },
  {
    id: 2,
    title: 'Raumprogramm',
    description: 'Detaillierte Angaben zu den benötigten Räumlichkeiten',
    completed: true,
    questions: [
      {
        id: 201,
        text: 'Wie viele Besprechungsräume werden benötigt?',
        type: 'number',
        answer: '6',
        required: true,
      },
      {
        id: 202,
        text: 'Größe des größten Besprechungsraums (m²)?',
        type: 'number',
        answer: '80',
        required: true,
      },
      {
        id: 203,
        text: 'Wird eine Kantine / ein Bistro benötigt?',
        type: 'boolean',
        answer: 'true',
        required: true,
      },
      {
        id: 204,
        text: 'Wie viele Sitzplätze soll die Kantine haben?',
        type: 'number',
        answer: '60',
        required: false,
      },
      {
        id: 205,
        text: 'Zusätzliche Raumanforderungen (Archiv, Server, etc.)?',
        type: 'text',
        answer: 'Serverraum ca. 25 m², Archivraum ca. 40 m², Druckerraum je Etage',
        required: false,
      },
    ],
  },
  {
    id: 3,
    title: 'Technische Anforderungen',
    description: 'Angaben zu technischer Ausstattung und Infrastruktur',
    completed: true,
    questions: [
      {
        id: 301,
        text: 'Welches Heizungssystem wird bevorzugt?',
        type: 'select',
        options: ['Fernwärme', 'Gas-Brennwert', 'Wärmepumpe', 'Pellets', 'Keine Präferenz'],
        answer: 'Wärmepumpe',
        required: true,
      },
      {
        id: 302,
        text: 'Ist eine Klimatisierung gewünscht?',
        type: 'boolean',
        answer: 'true',
        required: true,
      },
      {
        id: 303,
        text: 'Wird eine Photovoltaikanlage gewünscht?',
        type: 'boolean',
        answer: 'true',
        required: false,
      },
      {
        id: 304,
        text: 'Besondere IT-Anforderungen?',
        type: 'text',
        answer: 'CAT 7a Verkabelung, redundante Glasfaseranbindung, WLAN 6E flächendeckend',
        required: true,
      },
    ],
  },
  {
    id: 4,
    title: 'Gestaltung und Design',
    description: 'Ästhetische Anforderungen und Designwünsche',
    completed: false,
    questions: [
      {
        id: 401,
        text: 'Gibt es ein Corporate Design, das berücksichtigt werden soll?',
        type: 'boolean',
        answer: '',
        required: true,
      },
      {
        id: 402,
        text: 'Welchen Stil bevorzugen Sie für die Innengestaltung?',
        type: 'select',
        options: ['Modern-minimalistisch', 'Klassisch', 'Industriell', 'Skandinavisch', 'Keine Präferenz'],
        answer: '',
        required: true,
      },
      {
        id: 403,
        text: 'Besondere Materialwünsche für die Fassade?',
        type: 'text',
        answer: '',
        required: false,
      },
      {
        id: 404,
        text: 'Soll die Fassade begrünt werden?',
        type: 'boolean',
        answer: '',
        required: false,
      },
    ],
  },
  {
    id: 5,
    title: 'Außenanlagen',
    description: 'Anforderungen an Freiflächen und Stellplätze',
    completed: false,
    questions: [
      {
        id: 501,
        text: 'Wie viele PKW-Stellplätze werden benötigt?',
        type: 'number',
        answer: '',
        required: true,
      },
      {
        id: 502,
        text: 'Sind Fahrradstellplätze gewünscht?',
        type: 'boolean',
        answer: '',
        required: false,
      },
      {
        id: 503,
        text: 'Anzahl der Fahrradstellplätze?',
        type: 'number',
        answer: '',
        required: false,
      },
      {
        id: 504,
        text: 'Sind E-Ladestationen gewünscht?',
        type: 'boolean',
        answer: '',
        required: true,
      },
      {
        id: 505,
        text: 'Besondere Anforderungen an die Außenanlagen?',
        type: 'text',
        answer: '',
        required: false,
      },
    ],
  },
];

export default function QuestionnaireDetailPage() {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [activeSection, setActiveSection] = useState<number>(1);

  const updateAnswer = (sectionId: number, questionId: number, value: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((q) =>
                q.id === questionId ? { ...q, answer: value } : q,
              ),
            }
          : section,
      ),
    );
  };

  const completedSections = sections.filter((s) => s.completed).length;
  const totalSections = sections.length;
  const progressPercent = Math.round((completedSections / totalSections) * 100);

  const currentSection = sections.find((s) => s.id === activeSection);

  const answeredInCurrentSection =
    currentSection?.questions.filter((q) => q.answer !== '').length || 0;
  const totalInCurrentSection = currentSection?.questions.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/questionnaires">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Bedarfsermittlung Bürogebäude
            </h1>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              Aktiv
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Neubau Bürogebäude Friedrichstraße
          </p>
        </div>
        <Button>
          <Save className="h-4 w-4" />
          Antworten speichern
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Gesamtfortschritt</span>
          <span className="font-medium">
            {completedSections} von {totalSections} Abschnitten abgeschlossen (
            {progressPercent}%)
          </span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Section Navigation */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground mb-3">
            Abschnitte
          </p>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              {section.completed ? (
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${
                    activeSection === section.id
                      ? 'text-primary-foreground'
                      : 'text-green-600'
                  }`}
                />
              ) : (
                <Circle
                  className={`h-4 w-4 shrink-0 ${
                    activeSection === section.id
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                />
              )}
              <span className="truncate">{section.title}</span>
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="lg:col-span-3">
          {currentSection && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{currentSection.title}</CardTitle>
                    <CardDescription>{currentSection.description}</CardDescription>
                  </div>
                  <Badge variant="outline">
                    {answeredInCurrentSection}/{totalInCurrentSection} beantwortet
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentSection.questions.map((question, index) => (
                  <div key={question.id}>
                    {index > 0 && <Separator className="mb-6" />}
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Label className="text-sm font-medium leading-relaxed">
                          {index + 1}. {question.text}
                        </Label>
                        {question.required && (
                          <span className="text-xs text-destructive">*</span>
                        )}
                      </div>

                      {question.type === 'text' && (
                        <Textarea
                          value={question.answer}
                          onChange={(e) =>
                            updateAnswer(
                              currentSection.id,
                              question.id,
                              e.target.value,
                            )
                          }
                          placeholder="Ihre Antwort..."
                          rows={3}
                        />
                      )}

                      {question.type === 'number' && (
                        <Input
                          type="number"
                          value={question.answer}
                          onChange={(e) =>
                            updateAnswer(
                              currentSection.id,
                              question.id,
                              e.target.value,
                            )
                          }
                          placeholder="Zahl eingeben..."
                          className="max-w-xs"
                        />
                      )}

                      {question.type === 'boolean' && (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={question.answer === 'true'}
                            onCheckedChange={(checked) =>
                              updateAnswer(
                                currentSection.id,
                                question.id,
                                checked ? 'true' : 'false',
                              )
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {question.answer === 'true'
                              ? 'Ja'
                              : question.answer === 'false'
                                ? 'Nein'
                                : 'Nicht beantwortet'}
                          </span>
                        </div>
                      )}

                      {question.type === 'select' && question.options && (
                        <Select
                          value={question.answer}
                          onValueChange={(v) =>
                            updateAnswer(currentSection.id, question.id, v)
                          }
                        >
                          <SelectTrigger className="max-w-md">
                            <SelectValue placeholder="Bitte auswählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {question.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Answer status indicator */}
                      {question.answer ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3 w-3" />
                          Beantwortet
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {question.required
                            ? 'Pflichtfeld - noch nicht beantwortet'
                            : 'Optional - noch nicht beantwortet'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() =>
                setActiveSection((prev) => Math.max(1, prev - 1))
              }
              disabled={activeSection === 1}
            >
              Vorheriger Abschnitt
            </Button>
            <Button
              onClick={() =>
                setActiveSection((prev) =>
                  Math.min(sections.length, prev + 1),
                )
              }
              disabled={activeSection === sections.length}
            >
              Nächster Abschnitt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
