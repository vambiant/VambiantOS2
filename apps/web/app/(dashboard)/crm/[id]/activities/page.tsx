'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  StickyNote,
  Video,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Textarea,
  useToast,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const activityTypeApiToDisplay: Record<string, string> = {
  call: 'Telefonat',
  email: 'E-Mail',
  meeting: 'Besprechung',
  note: 'Notiz',
  task: 'Aufgabe',
};

const activityTypeDisplayToApi: Record<string, string> = {
  Telefonat: 'call',
  'E-Mail': 'email',
  Besprechung: 'meeting',
  Notiz: 'note',
  Aufgabe: 'task',
};

function getActivityIcon(type: string) {
  switch (type) {
    case 'call':
    case 'Telefonat':
      return <Phone className="h-4 w-4" />;
    case 'email':
    case 'E-Mail':
      return <Mail className="h-4 w-4" />;
    case 'meeting':
    case 'Besprechung':
      return <MessageSquare className="h-4 w-4" />;
    case 'note':
    case 'Notiz':
      return <StickyNote className="h-4 w-4" />;
    case 'task':
    case 'Aufgabe':
      return <Video className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'call':
    case 'Telefonat':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'email':
    case 'E-Mail':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'meeting':
    case 'Besprechung':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'note':
    case 'Notiz':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'task':
    case 'Aufgabe':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDateKey(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toISOString().split('T')[0] ?? '';
}

export default function CRMActivitiesPage() {
  const params = useParams();
  const orgId = Number(params.id);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [filterType, setFilterType] = useState<string>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Form state
  const [newType, setNewType] = useState<string>('call');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // Fetch organization name for header
  const { data: orgData } = trpc.crm.organizations.getById.useQuery(
    { id: orgId },
    { enabled: !Number.isNaN(orgId) },
  );

  // Fetch activities
  const apiType = filterType !== 'all' ? (activityTypeDisplayToApi[filterType] as 'call' | 'email' | 'meeting' | 'note' | 'task' | undefined) : undefined;
  const { data, isLoading, error } = trpc.crm.activities.list.useQuery(
    {
      organizationId: orgId,
      activityType: apiType,
      page: 1,
      pageSize: 100,
    },
    { enabled: !Number.isNaN(orgId) },
  );

  const createMutation = trpc.crm.activities.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Aktivität erfasst', description: 'Die Aktivität wurde erfolgreich gespeichert.' });
      setSheetOpen(false);
      resetForm();
      utils.crm.activities.list.invalidate();
      utils.crm.organizations.getById.invalidate({ id: orgId });
    },
    onError: (err) => {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' });
    },
  });

  const activities = data?.items ?? [];

  const resetForm = () => {
    setNewType('call');
    setNewSubject('');
    setNewDescription('');
    setNewDate('');
    setNewTime('');
  };

  const handleAddActivity = () => {
    if (!newSubject) {
      toast({ title: 'Betreff erforderlich', description: 'Bitte geben Sie einen Betreff ein.', variant: 'destructive' });
      return;
    }

    let scheduledAt: Date | undefined;
    if (newDate) {
      const dateStr = newTime ? `${newDate}T${newTime}` : `${newDate}T09:00`;
      scheduledAt = new Date(dateStr);
    }

    createMutation.mutate({
      organizationId: orgId,
      activityType: newType as 'call' | 'email' | 'meeting' | 'note' | 'task',
      subject: newSubject,
      description: newDescription || undefined,
      scheduledAt,
    });
  };

  // Group activities by date
  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const dateKey = getDateKey(activity.scheduledAt ?? activity.createdAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
      return groups;
    },
    {} as Record<string, typeof activities>,
  );

  const sortedDates = Object.keys(groupedActivities).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  const orgName = orgData?.name ?? 'Organisation';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/crm/${orgId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Aktivitäten</h1>
          <p className="text-muted-foreground">
            {orgName} &middot; {data?.total ?? 0} Einträge
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Aktivität erfassen
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Neue Aktivität erfassen</SheetTitle>
              <SheetDescription>
                Erfassen Sie eine neue Aktivität für {orgName}.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={newType}
                  onValueChange={setNewType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Telefonat</SelectItem>
                    <SelectItem value="email">E-Mail</SelectItem>
                    <SelectItem value="meeting">Besprechung</SelectItem>
                    <SelectItem value="note">Notiz</SelectItem>
                    <SelectItem value="task">Aufgabe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-subject">Betreff *</Label>
                <Input
                  id="activity-subject"
                  placeholder="Betreff der Aktivität"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-description">Beschreibung</Label>
                <Textarea
                  id="activity-description"
                  placeholder="Beschreiben Sie die Aktivität..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activity-date">Datum</Label>
                  <Input
                    id="activity-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity-time">Uhrzeit</Label>
                  <Input
                    id="activity-time"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <SheetClose asChild>
                <Button variant="outline">Abbrechen</Button>
              </SheetClose>
              <Button onClick={handleAddActivity} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Aktivität speichern
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'Telefonat', label: 'Telefonat' },
          { key: 'E-Mail', label: 'E-Mail' },
          { key: 'Besprechung', label: 'Besprechung' },
          { key: 'Notiz', label: 'Notiz' },
          { key: 'Aufgabe', label: 'Aufgabe' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterType(key)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
              filterType === key
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-accent'
            }`}
          >
            {key !== 'all' && getActivityIcon(activityTypeDisplayToApi[key] ?? key)}
            {label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-destructive">
          Fehler: {error.message}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {formatDate(date)}
                </h3>
                <div className="flex-1 border-t" />
              </div>
              <div className="space-y-3 ml-7">
                {(groupedActivities[date] ?? []).map((activity) => {
                  const displayType = activityTypeApiToDisplay[activity.activityType] ?? activity.activityType;
                  return (
                    <Card key={activity.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getActivityColor(activity.activityType)}`}
                          >
                            {getActivityIcon(activity.activityType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {displayType}
                              </Badge>
                              {activity.scheduledAt && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(activity.scheduledAt)} Uhr
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                &middot; {activity.userName}
                              </span>
                            </div>
                            {activity.subject && (
                              <p className="mt-1 font-medium">{activity.subject}</p>
                            )}
                            {activity.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                            )}
                            {activity.contactName && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="text-xs text-muted-foreground">
                                  Kontakt:
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {activity.contactName}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && activities.length === 0 && (
        <div className="py-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            Keine Aktivitäten gefunden
          </p>
        </div>
      )}
    </div>
  );
}
