'use client';

import { useState, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Badge, Button, ScrollArea, cn } from '@vambiant/ui';
import { TaskCard, type TaskCardData } from '@/components/tasks/task-card';

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  tasks: TaskCardData[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onColumnsChange: (columns: KanbanColumn[]) => void;
  onTaskClick?: (task: TaskCardData) => void;
  onAddTask?: (columnId: string) => void;
}

const columnColors: Record<string, string> = {
  offen: 'border-t-gray-400',
  in_bearbeitung: 'border-t-blue-500',
  review: 'border-t-purple-500',
  erledigt: 'border-t-green-500',
  blockiert: 'border-t-red-500',
};

const columnHeaderBg: Record<string, string> = {
  offen: 'bg-gray-50 dark:bg-gray-900/20',
  in_bearbeitung: 'bg-blue-50 dark:bg-blue-900/10',
  review: 'bg-purple-50 dark:bg-purple-900/10',
  erledigt: 'bg-green-50 dark:bg-green-900/10',
  blockiert: 'bg-red-50 dark:bg-red-900/10',
};

const countBadgeColors: Record<string, string> = {
  offen: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_bearbeitung: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  erledigt: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  blockiert: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

export function KanbanBoard({
  columns,
  onColumnsChange,
  onTaskClick,
  onAddTask,
}: KanbanBoardProps) {
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;

      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const newColumns = columns.map((col) => ({
        ...col,
        tasks: [...col.tasks],
      }));

      const sourceColumn = newColumns.find(
        (col) => col.id === source.droppableId,
      );
      const destColumn = newColumns.find(
        (col) => col.id === destination.droppableId,
      );

      if (!sourceColumn || !destColumn) return;

      const [movedTask] = sourceColumn.tasks.splice(source.index, 1);
      if (!movedTask) return;

      // Update the task status to match the destination column
      movedTask.status = destColumn.id;
      destColumn.tasks.splice(destination.index, 0, movedTask);

      onColumnsChange(newColumns);
    },
    [columns, onColumnsChange],
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-xl border border-t-4 bg-card shadow-sm',
              columnColors[column.id] || 'border-t-gray-400',
            )}
          >
            {/* Column header */}
            <div
              className={cn(
                'flex items-center justify-between rounded-t-lg px-3 py-2.5',
                columnHeaderBg[column.id] || 'bg-muted/30',
              )}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{column.title}</h3>
                <Badge
                  className={cn(
                    'px-1.5 text-[10px]',
                    countBadgeColors[column.id] || 'bg-gray-200 text-gray-700',
                  )}
                >
                  {column.tasks.length}
                </Badge>
              </div>
            </div>

            {/* Column body */}
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex-1 space-y-2 p-2 transition-colors',
                    snapshot.isDraggingOver && 'bg-accent/30',
                    column.tasks.length === 0 && !snapshot.isDraggingOver && 'min-h-[120px]',
                  )}
                  style={{ minHeight: 120 }}
                >
                  {column.tasks.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex h-[100px] items-center justify-center rounded-lg border border-dashed">
                      <p className="text-xs text-muted-foreground">
                        Keine Aufgaben
                      </p>
                    </div>
                  )}

                  {column.tasks.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                        >
                          <TaskCard
                            task={task}
                            onClick={() => onTaskClick?.(task)}
                            isDragging={dragSnapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Add task button */}
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => onAddTask?.(column.id)}
              >
                <Plus className="h-3.5 w-3.5" />
                Neue Aufgabe
              </Button>
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
