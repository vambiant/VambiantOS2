'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

/** Mapping of path segments to German labels. */
const segmentLabels: Record<string, string> = {
  dashboard: 'Übersicht',
  projects: 'Projekte',
  crm: 'CRM',
  costs: 'Kostenplanung',
  hoai: 'HOAI/Angebote',
  ava: 'AVA',
  contracts: 'Verträge',
  invoices: 'Rechnungen',
  'time-tracking': 'Zeiterfassung',
  resources: 'Ressourcen',
  bim: 'BIM',
  communication: 'Kommunikation',
  reports: 'Berichte',
  tenders: 'Ausschreibungen',
  wiki: 'Wiki',
  marketplace: 'Marktplatz',
  references: 'Referenzen',
  questionnaires: 'Fragebögen',
  settings: 'Einstellungen',
  general: 'Allgemein',
  members: 'Mitglieder',
  roles: 'Rollen',
  billing: 'Abrechnung',
  new: 'Neu',
  edit: 'Bearbeiten',
  tasks: 'Aufgaben',
  modules: 'Module',
  gantt: 'Gantt',
  kanban: 'Kanban',
  milestones: 'Meilensteine',
  deliverables: 'Ergebnisse',
  files: 'Dateien',
  activity: 'Aktivität',
  contacts: 'Kontakte',
  activities: 'Aktivitäten',
  positions: 'Positionen',
  bids: 'Angebote',
  award: 'Vergabe',
  aufmass: 'Aufmaß',
  preisspiegel: 'Preisspiegel',
};

function getLabel(segment: string): string {
  return segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const isLast = index === segments.length - 1;
    const label = getLabel(segment);

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="h-4 w-4" />
      </Link>

      {crumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
