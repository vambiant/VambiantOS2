'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, cn } from '@vambiant/ui';
import { GanttChart, type GanttTask } from '@/components/gantt/gantt-chart';

const mockGanttTasks: GanttTask[] = [
  // Modules
  { id: 'lp1', title: 'LP 1 - Grundlagenermittlung', startDate: '2025-10-01', endDate: '2025-11-15', progress: 100, type: 'module' },
  { id: 'lp2', title: 'LP 2 - Vorplanung', startDate: '2025-11-16', endDate: '2026-01-10', progress: 100, type: 'module' },
  { id: 'lp3', title: 'LP 3 - Entwurfsplanung', startDate: '2026-01-11', endDate: '2026-02-20', progress: 100, type: 'module' },
  { id: 'lp4', title: 'LP 4 - Genehmigungsplanung', startDate: '2026-02-21', endDate: '2026-03-20', progress: 80, type: 'module' },
  { id: 'lp5', title: 'LP 5 - Ausführungsplanung', startDate: '2026-03-01', endDate: '2026-06-30', progress: 35, type: 'module' },
  { id: 'lp6', title: 'LP 6 - Vorbereitung der Vergabe', startDate: '2026-05-01', endDate: '2026-07-15', progress: 0, type: 'module' },
  { id: 'lp7', title: 'LP 7 - Mitwirkung bei der Vergabe', startDate: '2026-06-15', endDate: '2026-08-30', progress: 0, type: 'module' },
  { id: 'lp8', title: 'LP 8 - Objektüberwachung', startDate: '2026-08-01', endDate: '2027-06-30', progress: 0, type: 'module' },
  { id: 'lp9', title: 'LP 9 - Objektbetreuung', startDate: '2027-07-01', endDate: '2027-12-31', progress: 0, type: 'module' },

  // LP1 tasks
  { id: 't1', title: 'Bestandsaufnahme Grundstück', startDate: '2025-10-01', endDate: '2025-10-14', progress: 100, type: 'task', parentId: 'lp1' },
  { id: 't2', title: 'Baugrunduntersuchung', startDate: '2025-10-07', endDate: '2025-10-28', progress: 100, type: 'task', parentId: 'lp1' },
  { id: 't3', title: 'Bedarfsprogramm erstellen', startDate: '2025-10-15', endDate: '2025-11-01', progress: 100, type: 'task', parentId: 'lp1' },
  { id: 't4', title: 'Behördenvorbesprechung', startDate: '2025-11-01', endDate: '2025-11-15', progress: 100, type: 'task', parentId: 'lp1', dependsOn: ['t3'] },

  // LP2 tasks
  { id: 't5', title: 'Vorentwurf Variante A', startDate: '2025-11-16', endDate: '2025-12-10', progress: 100, type: 'task', parentId: 'lp2', dependsOn: ['t4'] },
  { id: 't6', title: 'Vorentwurf Variante B', startDate: '2025-11-20', endDate: '2025-12-15', progress: 100, type: 'task', parentId: 'lp2' },
  { id: 't7', title: 'Kostenschätzung DIN 276', startDate: '2025-12-10', endDate: '2025-12-28', progress: 100, type: 'task', parentId: 'lp2', dependsOn: ['t5'] },
  { id: 't8', title: 'Vorplanungsbericht', startDate: '2025-12-28', endDate: '2026-01-10', progress: 100, type: 'task', parentId: 'lp2', dependsOn: ['t7'] },

  // LP3 tasks
  { id: 't9', title: 'Entwurf Grundrisse', startDate: '2026-01-11', endDate: '2026-01-30', progress: 100, type: 'task', parentId: 'lp3', dependsOn: ['t8'] },
  { id: 't10', title: 'Entwurf Ansichten/Schnitte', startDate: '2026-01-20', endDate: '2026-02-05', progress: 100, type: 'task', parentId: 'lp3' },
  { id: 't11', title: 'Kostenberechnung', startDate: '2026-02-01', endDate: '2026-02-15', progress: 100, type: 'task', parentId: 'lp3', dependsOn: ['t9'] },
  { id: 't12', title: 'Entwurfsbericht', startDate: '2026-02-10', endDate: '2026-02-20', progress: 100, type: 'task', parentId: 'lp3', dependsOn: ['t11'] },

  // LP4 tasks
  { id: 't13', title: 'Bauantragsunterlagen', startDate: '2026-02-21', endDate: '2026-03-05', progress: 100, type: 'task', parentId: 'lp4', dependsOn: ['t12'] },
  { id: 't14', title: 'Brandschutzkonzept', startDate: '2026-03-01', endDate: '2026-03-12', progress: 80, type: 'task', parentId: 'lp4' },
  { id: 't15', title: 'Baugenehmigung einreichen', startDate: '2026-03-10', endDate: '2026-03-20', progress: 50, type: 'task', parentId: 'lp4', dependsOn: ['t13', 't14'] },

  // LP5 tasks
  { id: 't16', title: 'Statische Berechnung Dach', startDate: '2026-03-01', endDate: '2026-04-15', progress: 55, type: 'task', parentId: 'lp5' },
  { id: 't17', title: 'Ausführungsdetails Fassade', startDate: '2026-03-10', endDate: '2026-05-01', progress: 40, type: 'task', parentId: 'lp5' },
  { id: 't18', title: 'TGA-Planung Heizung/Lüftung', startDate: '2026-03-20', endDate: '2026-05-15', progress: 0, type: 'task', parentId: 'lp5' },
  { id: 't19', title: 'Elektroplanung', startDate: '2026-04-01', endDate: '2026-05-30', progress: 0, type: 'task', parentId: 'lp5', dependsOn: ['t18'] },
  { id: 't20', title: 'Außenanlagenplanung', startDate: '2026-04-15', endDate: '2026-06-15', progress: 0, type: 'task', parentId: 'lp5' },
  { id: 't21', title: 'Werkplanung Treppe', startDate: '2026-05-01', endDate: '2026-06-01', progress: 0, type: 'task', parentId: 'lp5', dependsOn: ['t16'] },
  { id: 't22', title: 'Detailplanung Innenausbau', startDate: '2026-05-15', endDate: '2026-06-30', progress: 0, type: 'task', parentId: 'lp5' },

  // LP6 tasks
  { id: 't23', title: 'LV Rohbau', startDate: '2026-05-01', endDate: '2026-06-01', progress: 0, type: 'task', parentId: 'lp6', dependsOn: ['t16'] },
  { id: 't24', title: 'LV Fassade', startDate: '2026-05-15', endDate: '2026-06-15', progress: 0, type: 'task', parentId: 'lp6', dependsOn: ['t17'] },
  { id: 't25', title: 'LV TGA', startDate: '2026-06-01', endDate: '2026-07-01', progress: 0, type: 'task', parentId: 'lp6', dependsOn: ['t18', 't19'] },
  { id: 't26', title: 'Kostenanschlag', startDate: '2026-06-15', endDate: '2026-07-15', progress: 0, type: 'task', parentId: 'lp6', dependsOn: ['t23', 't24', 't25'] },
];

export default function GanttPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleTaskClick = (task: GanttTask) => {
    // TODO: Open task detail drawer
    console.log('Task clicked:', task.title);
  };

  return (
    <div className={cn('space-y-4', isFullscreen && 'fixed inset-0 z-50 bg-background p-6')}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Projektplan mit Modulen und Aufgaben
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="mr-1 h-3.5 w-3.5" />
                Beenden
              </>
            ) : (
              <>
                <Maximize2 className="mr-1 h-3.5 w-3.5" />
                Vollbild
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Gantt chart */}
      <div className={isFullscreen ? 'h-[calc(100vh-120px)]' : ''}>
        <GanttChart tasks={mockGanttTasks} onTaskClick={handleTaskClick} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-6 bg-red-500" />
          <span>Heute</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-primary/30">
            <div className="h-3 w-3 rounded bg-primary/70" />
          </div>
          <span>Fortschritt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="12">
            <path d="M 0 6 C 8 6, 16 6, 24 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="20 3, 24 6, 20 9" fill="currentColor" />
          </svg>
          <span>Abhängigkeit</span>
        </div>
      </div>
    </div>
  );
}
