'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { KanbanBoard, type KanbanColumn } from '@/components/kanban/kanban-board';
import { TaskForm, type TaskFormData } from '@/components/tasks/task-form';
import type { TaskCardData } from '@/components/tasks/task-card';

const initialColumns: KanbanColumn[] = [
  {
    id: 'offen',
    title: 'Offen',
    color: 'gray',
    tasks: [
      {
        id: 'k1',
        title: 'TGA-Planung Heizung/Lüftung',
        assignee: { name: 'Lisa Weber', initials: 'LW' },
        priority: 4,
        module: 'LP 5',
        dueDate: '2026-04-01',
        status: 'offen',
      },
      {
        id: 'k2',
        title: 'Elektroplanung Verteiler',
        assignee: { name: 'Lisa Weber', initials: 'LW' },
        priority: 3,
        module: 'LP 5',
        dueDate: '2026-04-10',
        status: 'offen',
      },
      {
        id: 'k3',
        title: 'Außenanlagenplanung',
        assignee: null,
        priority: 2,
        module: 'LP 5',
        dueDate: '2026-04-15',
        status: 'offen',
      },
      {
        id: 'k4',
        title: 'Werkplanung Treppe',
        assignee: { name: 'Stefan Braun', initials: 'SB' },
        priority: 3,
        module: 'LP 5',
        dueDate: '2026-05-01',
        status: 'offen',
      },
    ],
  },
  {
    id: 'in_bearbeitung',
    title: 'In Bearbeitung',
    color: 'blue',
    tasks: [
      {
        id: 'k5',
        title: 'Statische Berechnung Dachkonstruktion',
        assignee: { name: 'Thomas Müller', initials: 'TM' },
        priority: 5,
        module: 'LP 5',
        dueDate: '2026-03-20',
        status: 'in_bearbeitung',
      },
      {
        id: 'k6',
        title: 'Ausführungsdetails Fassade',
        assignee: { name: 'Anna Schmidt', initials: 'AS' },
        priority: 4,
        module: 'LP 5',
        dueDate: '2026-03-25',
        status: 'in_bearbeitung',
      },
      {
        id: 'k7',
        title: 'Baugenehmigung Unterlagen',
        assignee: { name: 'Max Mustermann', initials: 'MM' },
        priority: 5,
        module: 'LP 4',
        dueDate: '2026-03-15',
        status: 'in_bearbeitung',
      },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    color: 'purple',
    tasks: [
      {
        id: 'k8',
        title: 'Brandschutzkonzept aktualisieren',
        assignee: { name: 'Thomas Müller', initials: 'TM' },
        priority: 5,
        module: 'LP 4',
        dueDate: '2026-03-12',
        status: 'review',
      },
    ],
  },
  {
    id: 'erledigt',
    title: 'Erledigt',
    color: 'green',
    tasks: [
      {
        id: 'k9',
        title: 'Entwurf Grundrisse EG/OG',
        assignee: { name: 'Stefan Braun', initials: 'SB' },
        priority: 4,
        module: 'LP 3',
        dueDate: '2026-02-15',
        status: 'erledigt',
      },
      {
        id: 'k10',
        title: 'Vorentwurf Variante A erstellen',
        assignee: { name: 'Anna Schmidt', initials: 'AS' },
        priority: 4,
        module: 'LP 2',
        dueDate: '2026-02-01',
        status: 'erledigt',
      },
      {
        id: 'k11',
        title: 'Baugrunduntersuchung beauftragen',
        assignee: { name: 'Anna Schmidt', initials: 'AS' },
        priority: 4,
        module: 'LP 1',
        dueDate: '2026-01-20',
        status: 'erledigt',
      },
    ],
  },
  {
    id: 'blockiert',
    title: 'Blockiert',
    color: 'red',
    tasks: [
      {
        id: 'k12',
        title: 'Leistungsverzeichnis Rohbau erstellen',
        assignee: { name: 'Max Mustermann', initials: 'MM' },
        priority: 3,
        module: 'LP 6',
        dueDate: '2026-05-01',
        status: 'blockiert',
      },
    ],
  },
];

export default function KanbanPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [columns, setColumns] = useState(initialColumns);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [addToColumn, setAddToColumn] = useState<string>('offen');

  const handleAddTask = (columnId: string) => {
    setAddToColumn(columnId);
    setTaskFormOpen(true);
  };

  const handleTaskClick = (task: TaskCardData) => {
    // TODO: Open task detail drawer
    console.log('Task clicked:', task.title);
  };

  const handleCreateTask = (data: TaskFormData) => {
    const newTask: TaskCardData = {
      id: `k${Date.now()}`,
      title: data.title,
      assignee: data.assignee
        ? { name: 'Neuer Mitarbeiter', initials: 'NM' }
        : null,
      priority: Number(data.priority),
      module: data.module ? `LP ${data.module.replace('lp', '')}` : 'LP ?',
      dueDate: data.dueDate || null,
      status: addToColumn,
    };

    setColumns((prev) =>
      prev.map((col) =>
        col.id === addToColumn
          ? { ...col, tasks: [...col.tasks, newTask] }
          : col,
      ),
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          Verschieben Sie Aufgaben per Drag &amp; Drop zwischen den Spalten
        </p>
      </div>

      {/* Kanban board */}
      <KanbanBoard
        columns={columns}
        onColumnsChange={setColumns}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTask}
      />

      {/* Task form */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onSubmit={handleCreateTask}
        initialData={{ status: addToColumn }}
        mode="create"
      />
    </div>
  );
}
