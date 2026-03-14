'use client';

import { CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, cn } from '@vambiant/ui';

export interface TaskCardData {
  id: string;
  title: string;
  assignee: { name: string; initials: string } | null;
  priority: number;
  module: string;
  dueDate: string | null;
  status: string;
}

interface TaskCardProps {
  task: TaskCardData;
  onClick?: () => void;
  isDragging?: boolean;
}

function getPriorityColor(priority: number): string {
  switch (priority) {
    case 5:
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 4:
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    case 3:
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 2:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 1:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 5:
      return 'Kritisch';
    case 4:
      return 'Hoch';
    case 3:
      return 'Mittel';
    case 2:
      return 'Niedrig';
    case 1:
      return 'Sehr niedrig';
    default:
      return 'Unbekannt';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md',
        isDragging && 'rotate-2 shadow-lg ring-2 ring-primary/20',
      )}
      onClick={onClick}
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge className={`text-[10px] ${getPriorityColor(task.priority)}`}>
          {getPriorityLabel(task.priority)}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {task.module}
        </Badge>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-primary/10 text-[8px] font-medium text-primary">
                {task.assignee.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {task.assignee.name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Nicht zugewiesen</span>
        )}

        {task.dueDate && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue(task.dueDate)
                ? 'text-destructive font-medium'
                : 'text-muted-foreground',
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {formatDate(task.dueDate)}
          </div>
        )}
      </div>
    </div>
  );
}
