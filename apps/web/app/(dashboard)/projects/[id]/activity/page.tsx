'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  MessageSquare,
  Milestone,
  Package,
  Paperclip,
  Upload,
  Users,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@vambiant/ui';

interface ActivityEntry {
  id: string;
  type: 'task' | 'module' | 'milestone' | 'comment' | 'file' | 'team';
  user: { name: string; initials: string };
  action: string;
  target: string;
  targetLink?: string;
  timestamp: string;
  details?: string;
}

const mockActivities: ActivityEntry[] = [
  { id: '1', type: 'task', user: { name: 'Anna Schmidt', initials: 'AS' }, action: 'hat Aufgabe als erledigt markiert', target: 'Statik Prüfbericht', timestamp: '2026-03-10T14:45:00', details: 'LP 5 - Ausführungsplanung' },
  { id: '2', type: 'comment', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat einen Kommentar hinzugefügt zu', target: 'Fassadenplanung', timestamp: '2026-03-10T14:30:00', details: '"Bitte die Dämmstärke nochmals prüfen, der U-Wert scheint zu hoch."' },
  { id: '3', type: 'file', user: { name: 'Thomas Müller', initials: 'TM' }, action: 'hat Datei hochgeladen', target: 'Brandschutzkonzept_v2.1.pdf', timestamp: '2026-03-10T13:15:00', details: '3,8 MB - LP 4' },
  { id: '4', type: 'task', user: { name: 'Lisa Weber', initials: 'LW' }, action: 'hat Aufgabe erstellt', target: 'TGA-Planung Heizung/Lüftung', timestamp: '2026-03-10T11:00:00', details: 'Priorität: Hoch, Fällig: 01.04.2026' },
  { id: '5', type: 'milestone', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat Meilenstein aktualisiert', target: 'Baugenehmigung eingereicht', timestamp: '2026-03-10T10:30:00', details: 'Status geändert: Offen -> In Bearbeitung' },
  { id: '6', type: 'module', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat Modul aktualisiert', target: 'LP 4 - Genehmigungsplanung', timestamp: '2026-03-10T10:00:00', details: 'Fortschritt: 60% -> 80%' },
  { id: '7', type: 'task', user: { name: 'Thomas Müller', initials: 'TM' }, action: 'hat 4,5 Stunden erfasst für', target: 'Statische Berechnung Dachkonstruktion', timestamp: '2026-03-09T17:30:00', details: 'Gesamtstunden: 18 von 32 h' },
  { id: '8', type: 'comment', user: { name: 'Anna Schmidt', initials: 'AS' }, action: 'hat einen Kommentar hinzugefügt zu', target: 'Ausführungsdetails Fassade', timestamp: '2026-03-09T16:00:00', details: '"Detail 4.2 muss noch mit dem Fassadenbauer abgestimmt werden."' },
  { id: '9', type: 'file', user: { name: 'Stefan Braun', initials: 'SB' }, action: 'hat Datei hochgeladen', target: 'Werkplan_Dach_v0.3.dwg', timestamp: '2026-03-09T14:20:00', details: '22,1 MB - LP 5' },
  { id: '10', type: 'task', user: { name: 'Stefan Braun', initials: 'SB' }, action: 'hat Aufgabe erstellt', target: 'Grundrisse EG überarbeiten', timestamp: '2026-03-09T11:00:00', details: 'Priorität: Mittel, LP 5' },
  { id: '11', type: 'team', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat Mitarbeiter hinzugefügt', target: 'Claudia Fischer', timestamp: '2026-03-08T16:30:00', details: 'Rolle: Bauleiterin' },
  { id: '12', type: 'task', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat Aufgabe zugewiesen an Anna Schmidt:', target: 'Ausführungsdetails Fassade', timestamp: '2026-03-08T14:00:00' },
  { id: '13', type: 'milestone', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat Meilenstein erstellt', target: 'Ausführungsplanung 50%', timestamp: '2026-03-08T10:00:00', details: 'Zieldatum: 01.04.2026' },
  { id: '14', type: 'file', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat Datei hochgeladen', target: 'Bauantrag_komplett.pdf', timestamp: '2026-03-07T16:00:00', details: '15,4 MB - LP 4' },
  { id: '15', type: 'module', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat Modul abgeschlossen', target: 'LP 3 - Entwurfsplanung', timestamp: '2026-03-07T12:00:00', details: 'Alle 10 Aufgaben erledigt' },
  { id: '16', type: 'task', user: { name: 'Anna Schmidt', initials: 'AS' }, action: 'hat Aufgabe als erledigt markiert', target: 'Entwurfsbericht', timestamp: '2026-03-07T11:30:00' },
  { id: '17', type: 'comment', user: { name: 'Thomas Müller', initials: 'TM' }, action: 'hat einen Kommentar hinzugefügt zu', target: 'Statische Nachweise', timestamp: '2026-03-06T15:00:00', details: '"Prüfstatiker hat die Nachweise freigegeben."' },
  { id: '18', type: 'task', user: { name: 'Lisa Weber', initials: 'LW' }, action: 'hat Aufgabe als erledigt markiert', target: 'Wärmeschutznachweis GEG', timestamp: '2026-03-06T10:00:00' },
  { id: '19', type: 'file', user: { name: 'Anna Schmidt', initials: 'AS' }, action: 'hat Datei hochgeladen', target: 'Ansicht_Nord.pdf', timestamp: '2026-03-05T14:00:00', details: '6,1 MB - LP 3' },
  { id: '20', type: 'task', user: { name: 'Max Mustermann', initials: 'MM' }, action: 'hat 6 Stunden erfasst für', target: 'Kostenberechnung DIN 276', timestamp: '2026-03-05T17:00:00' },
];

function getTypeIcon(type: string) {
  switch (type) {
    case 'task':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'module':
      return <Package className="h-4 w-4" />;
    case 'milestone':
      return <Milestone className="h-4 w-4" />;
    case 'comment':
      return <MessageSquare className="h-4 w-4" />;
    case 'file':
      return <Upload className="h-4 w-4" />;
    case 'team':
      return <Users className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'task':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
    case 'module':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
    case 'milestone':
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'comment':
      return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
    case 'file':
      return 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400';
    case 'team':
      return 'bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 60) return `Vor ${diffMin} Min.`;
  if (diffHours < 24) return `Vor ${diffHours} Std.`;
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function groupByDate(activities: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const groups = new Map<string, ActivityEntry[]>();
  for (const activity of activities) {
    const date = new Date(activity.timestamp).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(activity);
  }
  return groups;
}

export default function ActivityPage() {
  const params = useParams();
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(15);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredActivities = mockActivities.filter((a) => {
    if (typeFilter === 'all') return true;
    return a.type === typeFilter;
  });

  const visibleActivities = filteredActivities.slice(0, visibleCount);
  const hasMore = visibleCount < filteredActivities.length;

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + 10, filteredActivities.length));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filteredActivities.length]);

  const groupedActivities = groupByDate(visibleActivities);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Aktivitäten</SelectItem>
            <SelectItem value="task">Aufgaben</SelectItem>
            <SelectItem value="module">Module</SelectItem>
            <SelectItem value="milestone">Meilensteine</SelectItem>
            <SelectItem value="comment">Kommentare</SelectItem>
            <SelectItem value="file">Dateien</SelectItem>
            <SelectItem value="team">Team</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredActivities.length} Einträge
        </span>
      </div>

      {/* Activity feed */}
      <div className="space-y-8">
        {Array.from(groupedActivities.entries()).map(([date, activities]) => (
          <div key={date}>
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-1">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {date}
              </h3>
            </div>

            <div className="mt-3 space-y-1">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent/30"
                >
                  {/* User avatar */}
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {activity.user.initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{' '}
                      {activity.action}{' '}
                      <span className="font-medium text-primary">
                        {activity.target}
                      </span>
                    </p>
                    {activity.details && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activity.details}
                      </p>
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>

                  {/* Type icon */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                      getTypeColor(activity.type),
                    )}
                  >
                    {getTypeIcon(activity.type)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center">
          <p className="text-sm text-muted-foreground">Weitere laden...</p>
        </div>
      )}

      {filteredActivities.length === 0 && (
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
