'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface TimesheetEntry {
  id: number;
  projekt: string;
  modul: string;
  farbe: string;
  stunden: number[];
}

interface WeeklyTimesheetProps {
  tage?: string[];
  daten?: string[];
  initialRows?: TimesheetEntry[];
  showWeekend?: boolean;
  onSave?: (rows: TimesheetEntry[]) => void;
}

const defaultTage = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const defaultDaten = ['09.03.', '10.03.', '11.03.', '12.03.', '13.03.'];

const defaultRows: TimesheetEntry[] = [
  {
    id: 1,
    projekt: 'Bürogebäude Friedrichstraße',
    modul: 'LP 5 - Ausführungsplanung',
    farbe: 'bg-blue-500',
    stunden: [8, 7.5, 6, 8, 4],
  },
  {
    id: 2,
    projekt: 'Wohnanlage Prenzlauer Berg',
    modul: 'LP 3 - Entwurfsplanung',
    farbe: 'bg-emerald-500',
    stunden: [0, 0.5, 2, 0, 4],
  },
  {
    id: 3,
    projekt: 'Kindergarten Stadtpark',
    modul: 'LP 7 - Ausschreibung',
    farbe: 'bg-amber-500',
    stunden: [0, 0, 0, 0, 0],
  },
];

export function WeeklyTimesheet({
  tage = defaultTage,
  daten = defaultDaten,
  initialRows = defaultRows,
  showWeekend = false,
}: WeeklyTimesheetProps) {
  const [rows, setRows] = useState<TimesheetEntry[]>(initialRows);

  const displayTage = showWeekend ? [...tage, 'Sa', 'So'] : tage;
  const displayDaten = showWeekend
    ? [...daten, '14.03.', '15.03.']
    : daten;

  const dayTotals = displayTage.map((_, idx) =>
    rows.reduce((sum, row) => sum + (row.stunden[idx] ?? 0), 0),
  );
  const grandTotal = dayTotals.reduce((sum, d) => sum + d, 0);

  function handleHoursChange(rowId: number, dayIdx: number, value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const newStunden = [...row.stunden];
        newStunden[dayIdx] = parseFloat(value) || 0;
        return { ...row, stunden: newStunden };
      }),
    );
  }

  function addRow() {
    const newId = Math.max(...rows.map((r) => r.id), 0) + 1;
    const farben = ['bg-rose-500', 'bg-cyan-500', 'bg-violet-500', 'bg-orange-500'];
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        projekt: 'Neues Projekt',
        modul: 'Modul wählen',
        farbe: farben[newId % farben.length]!,
        stunden: displayTage.map(() => 0),
      },
    ]);
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="min-w-[250px] px-4 py-3 text-left font-medium text-muted-foreground">
                Projekt / Modul
              </th>
              {displayTage.map((tag, idx) => (
                <th key={tag} className="w-20 px-2 py-3 text-center font-medium text-muted-foreground">
                  <div>{tag}</div>
                  <div className="text-[10px] font-normal">{displayDaten[idx]}</div>
                </th>
              ))}
              <th className="w-20 px-4 py-3 text-right font-medium text-muted-foreground">Summe</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const rowTotal = row.stunden.reduce((s, h) => s + h, 0);
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 shrink-0 rounded-sm ${row.farbe}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.projekt}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.modul}</p>
                      </div>
                    </div>
                  </td>
                  {displayTage.map((_, idx) => (
                    <td key={`${row.id}-${idx}`} className="px-1 py-2.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={row.stunden[idx] || ''}
                        onChange={(e) => handleHoursChange(row.id, idx, e.target.value)}
                        placeholder="-"
                        className="h-8 w-full rounded-md border bg-transparent text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-bold">
                    {rowTotal > 0 ? rowTotal.toFixed(1) : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Add Row */}
            <tr>
              <td colSpan={displayTage.length + 2} className="px-4 py-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Zeile hinzufügen
                </button>
              </td>
            </tr>

            {/* Totals */}
            <tr className="border-t-2 bg-muted/50 font-bold">
              <td className="px-4 py-3">Summe</td>
              {dayTotals.map((total, idx) => (
                <td
                  key={`total-${idx}`}
                  className={`px-2 py-3 text-center ${total > 8 ? 'text-red-600' : ''}`}
                >
                  {total > 0 ? total.toFixed(1) : '-'}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-base">{grandTotal.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
