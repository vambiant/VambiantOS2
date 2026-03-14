'use client';

import { X } from 'lucide-react';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vambiant/ui';

export interface TaskFilterValues {
  status: string;
  priority: string;
  module: string;
  assignee: string;
}

interface TaskFiltersProps {
  filters: TaskFilterValues;
  onFilterChange: (filters: TaskFilterValues) => void;
}

const statuses = [
  { value: 'all', label: 'Alle Status' },
  { value: 'offen', label: 'Offen' },
  { value: 'in_bearbeitung', label: 'In Bearbeitung' },
  { value: 'review', label: 'Review' },
  { value: 'erledigt', label: 'Erledigt' },
  { value: 'blockiert', label: 'Blockiert' },
];

const priorities = [
  { value: 'all', label: 'Alle Prioritäten' },
  { value: '1', label: 'Sehr niedrig' },
  { value: '2', label: 'Niedrig' },
  { value: '3', label: 'Mittel' },
  { value: '4', label: 'Hoch' },
  { value: '5', label: 'Kritisch' },
];

const modules = [
  { value: 'all', label: 'Alle Module' },
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

const assignees = [
  { value: 'all', label: 'Alle Mitarbeiter' },
  { value: '1', label: 'Max Mustermann' },
  { value: '2', label: 'Anna Schmidt' },
  { value: '3', label: 'Thomas Müller' },
  { value: '4', label: 'Lisa Weber' },
  { value: '5', label: 'Stefan Braun' },
];

export function TaskFilters({ filters, onFilterChange }: TaskFiltersProps) {
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== 'all',
  ).length;

  const resetFilters = () => {
    onFilterChange({
      status: 'all',
      priority: 'all',
      module: 'all',
      assignee: 'all',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFilterChange({ ...filters, status: value })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(value) =>
          onFilterChange({ ...filters, priority: value })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Priorität" />
        </SelectTrigger>
        <SelectContent>
          {priorities.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.module}
        onValueChange={(value) =>
          onFilterChange({ ...filters, module: value })
        }
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Modul" />
        </SelectTrigger>
        <SelectContent>
          {modules.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assignee}
        onValueChange={(value) =>
          onFilterChange({ ...filters, assignee: value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Zugewiesen" />
        </SelectTrigger>
        <SelectContent>
          {assignees.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
          <X className="h-3.5 w-3.5" />
          Filter zurücksetzen
          <Badge variant="secondary" className="ml-1 px-1.5">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
