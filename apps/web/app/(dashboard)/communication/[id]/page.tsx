'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Download,
  MapPin,
  Send,
  User,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Separator,
} from '@vambiant/ui';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function CommunicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const commId = parseInt(id, 10);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: comm, isLoading, error } = trpc.communication.getById.useQuery(
    { id: commId },
    { enabled: !isNaN(commId) },
  );

  const updateActionItem = trpc.communication.actionItemsUpdate.useMutation({
    onSuccess: () => {
      utils.communication.getById.invalidate({ id: commId });
    },
    onError: (err) => {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Wird geladen...</p>
      </div>
    );
  }

  if (error || !comm) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-destructive">
          {error?.message ?? 'Protokoll nicht gefunden'}
        </p>
        <Link href="/communication" className="mt-4 text-sm text-primary hover:underline">
          Zur Kommunikation
        </Link>
      </div>
    );
  }

  const actionItems = comm.actionItems ?? [];
  const completedCount = actionItems.filter((item) => item.status === 'completed').length;

  const toggleActionItem = (itemId: number, currentStatus: string | null) => {
    const newStatus = currentStatus === 'completed' ? 'open' : 'completed';
    updateActionItem.mutate({ id: itemId, status: newStatus });
  };

  const metadata = (comm.metadata ?? {}) as Record<string, string | undefined>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/communication">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {comm.subject}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {comm.projectName ?? '---'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4" />
            Per E-Mail senden
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Meta info */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatDate(comm.date)}</span>
        </div>
        {metadata.time && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{metadata.time}</span>
          </div>
        )}
        {comm.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{comm.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>Protokoll: {comm.creatorName ?? '---'}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Teilnehmer ({comm.participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comm.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start gap-3"
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      p.attended
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {p.attended ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="text-xs">A</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.userName ?? `Teilnehmer #${p.id}`}</p>
                    <p className="text-xs text-muted-foreground">{p.role ?? '---'}</p>
                  </div>
                </div>
              ))}
              {comm.participants.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine Teilnehmer erfasst</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Protokollinhalt</CardTitle>
            </CardHeader>
            <CardContent>
              {comm.content ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {comm.content.split('\n').map((line, index) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <br key={index} />;
                    if (trimmed.startsWith('## ')) {
                      return (
                        <h3
                          key={index}
                          className="mt-4 mb-2 text-base font-semibold"
                        >
                          {trimmed.replace('## ', '')}
                        </h3>
                      );
                    }
                    if (trimmed.startsWith('**Beschluss:**')) {
                      return (
                        <div
                          key={index}
                          className="my-2 rounded-lg border-l-4 border-primary bg-primary/5 p-3"
                        >
                          <p className="font-medium">
                            {trimmed.replace('**Beschluss:**', 'Beschluss:')}
                          </p>
                        </div>
                      );
                    }
                    if (trimmed.startsWith('- ')) {
                      return (
                        <li key={index} className="ml-4 text-sm">
                          {trimmed.replace('- ', '')}
                        </li>
                      );
                    }
                    return (
                      <p key={index} className="text-sm leading-relaxed">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Kein Inhalt vorhanden</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Massnahmen / Aufgaben ({completedCount}/{actionItems.length}{' '}
                erledigt)
              </CardTitle>
              <Badge variant="outline">
                {actionItems.length > 0
                  ? `${Math.round((completedCount / actionItems.length) * 100)}% erledigt`
                  : '0%'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actionItems.map((item) => {
                const isDone = item.status === 'completed';
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      isDone ? 'bg-muted/50 opacity-60' : ''
                    }`}
                  >
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={() => toggleActionItem(item.id, item.status)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${isDone ? 'line-through' : ''}`}
                      >
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {item.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            bis {formatDate(item.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isDone && item.dueDate && new Date(item.dueDate) < new Date() && (
                      <Badge variant="destructive" className="text-xs shrink-0">
                        Überfällig
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
