'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@vambiant/ui';

export interface GanttTask {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  progress: number;
  type: 'module' | 'task';
  parentId?: string;
  color?: string;
  dependsOn?: string[];
}

interface GanttChartProps {
  tasks: GanttTask[];
  onTaskClick?: (task: GanttTask) => void;
}

const MODULE_COLORS: Record<string, string> = {
  lp1: '#22c55e',
  lp2: '#3b82f6',
  lp3: '#8b5cf6',
  lp4: '#f59e0b',
  lp5: '#ef4444',
  lp6: '#06b6d4',
  lp7: '#ec4899',
  lp8: '#f97316',
  lp9: '#6366f1',
};

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 56;
const LEFT_PANEL_WIDTH = 320;
const DAY_WIDTH = 28;

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
}

function formatWeek(date: Date): string {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // Compute timeline boundaries
  const { timelineStart, timelineEnd, totalDays, months, weeks } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return {
        timelineStart: now,
        timelineEnd: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        totalDays: 90,
        months: [] as { label: string; startDay: number; days: number }[],
        weeks: [] as { label: string; day: number }[],
      };
    }

    const dates = tasks.flatMap((t) => [parseDate(t.startDate), parseDate(t.endDate)]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Add padding
    const start = new Date(minDate);
    start.setDate(start.getDate() - 14);
    start.setDate(1); // Start at first of month
    const end = new Date(maxDate);
    end.setDate(end.getDate() + 30);

    const days = daysBetween(start, end);

    // Compute months
    const monthList: { label: string; startDay: number; days: number }[] = [];
    const cursor = new Date(start);
    while (cursor < end) {
      const monthStart = new Date(cursor);
      const label = formatMonth(monthStart);
      const startDay = daysBetween(start, monthStart);
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(1);
      const endOfMonth = new Date(Math.min(cursor.getTime(), end.getTime()));
      const monthDays = daysBetween(monthStart, endOfMonth);
      monthList.push({ label, startDay, days: monthDays });
    }

    // Compute weeks
    const weekList: { label: string; day: number }[] = [];
    const weekCursor = new Date(start);
    // Align to Monday
    const dayOfWeek = weekCursor.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekCursor.setDate(weekCursor.getDate() + mondayOffset);
    while (weekCursor < end) {
      const day = daysBetween(start, weekCursor);
      if (day >= 0) {
        weekList.push({ label: formatWeek(weekCursor), day });
      }
      weekCursor.setDate(weekCursor.getDate() + 7);
    }

    return { timelineStart: start, timelineEnd: end, totalDays: days, months: monthList, weeks: weekList };
  }, [tasks]);

  // Build visible row list
  const visibleRows = useMemo(() => {
    const modules = tasks.filter((t) => t.type === 'module');
    const rows: GanttTask[] = [];
    for (const mod of modules) {
      rows.push(mod);
      if (!collapsedModules.has(mod.id)) {
        const children = tasks.filter(
          (t) => t.type === 'task' && t.parentId === mod.id,
        );
        rows.push(...children);
      }
    }
    // Add orphan tasks (no parent)
    const orphans = tasks.filter(
      (t) => t.type === 'task' && !t.parentId,
    );
    rows.push(...orphans);
    return rows;
  }, [tasks, collapsedModules]);

  const toggleModule = (moduleId: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Today marker position
  const today = new Date();
  const todayOffset = daysBetween(timelineStart, today);

  // Compute bar positions
  const getBarPosition = useCallback(
    (task: GanttTask) => {
      const start = daysBetween(timelineStart, parseDate(task.startDate));
      const duration = daysBetween(parseDate(task.startDate), parseDate(task.endDate));
      return { left: start * DAY_WIDTH, width: Math.max(duration * DAY_WIDTH, DAY_WIDTH) };
    },
    [timelineStart],
  );

  // Dependency lines
  const dependencyLines = useMemo(() => {
    const lines: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
    for (const task of visibleRows) {
      if (!task.dependsOn) continue;
      const taskIndex = visibleRows.findIndex((r) => r.id === task.id);
      if (taskIndex === -1) continue;
      const taskBar = getBarPosition(task);

      for (const depId of task.dependsOn) {
        const depIndex = visibleRows.findIndex((r) => r.id === depId);
        if (depIndex === -1) continue;
        const depTask = visibleRows[depIndex]!;
        const depBar = getBarPosition(depTask);

        lines.push({
          from: {
            x: depBar.left + depBar.width,
            y: depIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
          },
          to: {
            x: taskBar.left,
            y: taskIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
          },
        });
      }
    }
    return lines;
  }, [visibleRows, getBarPosition]);

  const totalWidth = totalDays * DAY_WIDTH;
  const totalHeight = visibleRows.length * ROW_HEIGHT;

  return (
    <div className="flex overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Left panel - task names */}
      <div
        ref={leftPanelRef}
        className="shrink-0 border-r bg-card"
        style={{ width: LEFT_PANEL_WIDTH }}
      >
        {/* Header */}
        <div
          className="flex items-end border-b bg-muted/30 px-3"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className="pb-2 text-xs font-medium text-muted-foreground">
            Aufgabe / Modul
          </span>
        </div>

        {/* Rows */}
        <div className="overflow-hidden" style={{ height: totalHeight }}>
          {visibleRows.map((task, index) => {
            const isModule = task.type === 'module';
            const isCollapsed = collapsedModules.has(task.id);
            const childCount = tasks.filter(
              (t) => t.type === 'task' && t.parentId === task.id,
            ).length;

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center border-b px-3 text-sm transition-colors hover:bg-accent/30',
                  isModule && 'font-semibold bg-muted/20',
                )}
                style={{ height: ROW_HEIGHT }}
              >
                {isModule ? (
                  <button
                    type="button"
                    onClick={() => toggleModule(task.id)}
                    className="flex items-center gap-1.5 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{task.title}</span>
                    <span className="ml-1 shrink-0 text-[10px] font-normal text-muted-foreground">
                      ({childCount})
                    </span>
                  </button>
                ) : (
                  <span className="truncate pl-6 text-muted-foreground">
                    {task.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel - timeline */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={scrollRef}>
        <div style={{ width: totalWidth, minWidth: '100%' }}>
          {/* Timeline header */}
          <div
            className="sticky top-0 z-10 border-b bg-muted/30"
            style={{ height: HEADER_HEIGHT }}
          >
            {/* Months row */}
            <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
              {months.map((month, i) => (
                <div
                  key={`${month.label}-${i}`}
                  className="flex items-center border-r px-2 text-xs font-medium text-muted-foreground"
                  style={{ width: month.days * DAY_WIDTH, minWidth: 0 }}
                >
                  <span className="truncate">{month.label}</span>
                </div>
              ))}
            </div>
            {/* Weeks row */}
            <div className="relative" style={{ height: HEADER_HEIGHT / 2 }}>
              {weeks.map((week, i) => (
                <div
                  key={`w-${i}`}
                  className="absolute flex items-center text-[10px] text-muted-foreground"
                  style={{
                    left: week.day * DAY_WIDTH,
                    width: 7 * DAY_WIDTH,
                    height: HEADER_HEIGHT / 2,
                  }}
                >
                  <span className="border-l border-border/50 pl-1">
                    {week.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart area */}
          <div className="relative" style={{ height: totalHeight }}>
            {/* Row backgrounds with grid lines */}
            {visibleRows.map((task, index) => (
              <div
                key={`bg-${task.id}`}
                className={cn(
                  'absolute w-full border-b',
                  task.type === 'module' ? 'bg-muted/10' : 'bg-transparent',
                  index % 2 === 0 ? '' : 'bg-muted/5',
                )}
                style={{
                  top: index * ROW_HEIGHT,
                  height: ROW_HEIGHT,
                }}
              />
            ))}

            {/* Weekly grid lines */}
            {weeks.map((week, i) => (
              <div
                key={`grid-${i}`}
                className="absolute top-0 h-full border-l border-border/20"
                style={{ left: week.day * DAY_WIDTH }}
              />
            ))}

            {/* Today marker */}
            {todayOffset >= 0 && todayOffset <= totalDays && (
              <div
                className="absolute top-0 z-20 h-full w-0.5 bg-red-500"
                style={{ left: todayOffset * DAY_WIDTH }}
              >
                <div className="absolute -left-2.5 -top-0.5 rounded-sm bg-red-500 px-1 py-px text-[9px] font-bold text-white">
                  Heute
                </div>
              </div>
            )}

            {/* Dependency arrows */}
            <svg
              className="pointer-events-none absolute inset-0 z-10"
              style={{ width: totalWidth, height: totalHeight }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="6"
                  markerHeight="4"
                  refX="6"
                  refY="2"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 6 2, 0 4"
                    fill="currentColor"
                    className="text-muted-foreground/60"
                  />
                </marker>
              </defs>
              {dependencyLines.map((line, i) => {
                const midX = (line.from.x + line.to.x) / 2;
                return (
                  <path
                    key={`dep-${i}`}
                    d={`M ${line.from.x} ${line.from.y} C ${midX} ${line.from.y}, ${midX} ${line.to.y}, ${line.to.x} ${line.to.y}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-muted-foreground/40"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
            </svg>

            {/* Task bars */}
            {visibleRows.map((task, index) => {
              const { left, width } = getBarPosition(task);
              const isModule = task.type === 'module';
              const barColor =
                task.color ||
                (task.parentId ? MODULE_COLORS[task.parentId] : MODULE_COLORS[task.id]) ||
                '#6366f1';

              return (
                <div
                  key={`bar-${task.id}`}
                  className={cn(
                    'absolute z-10 cursor-pointer transition-opacity hover:opacity-90',
                    isModule ? 'h-5' : 'h-4',
                  )}
                  style={{
                    left,
                    width,
                    top: index * ROW_HEIGHT + (ROW_HEIGHT - (isModule ? 20 : 16)) / 2,
                  }}
                  onClick={() => onTaskClick?.(task)}
                >
                  {/* Background bar */}
                  <div
                    className={cn(
                      'h-full w-full overflow-hidden',
                      isModule ? 'rounded-md' : 'rounded',
                    )}
                    style={{ backgroundColor: `${barColor}30` }}
                  >
                    {/* Progress fill */}
                    <div
                      className={cn(
                        'h-full transition-all',
                        isModule ? 'rounded-md' : 'rounded',
                      )}
                      style={{
                        width: `${task.progress}%`,
                        backgroundColor: barColor,
                        opacity: isModule ? 0.8 : 0.7,
                      }}
                    />
                  </div>
                  {/* Module diamond markers */}
                  {isModule && (
                    <>
                      <div
                        className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45"
                        style={{ backgroundColor: barColor }}
                      />
                      <div
                        className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45"
                        style={{ backgroundColor: barColor }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
